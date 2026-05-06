use std::{convert::Infallible, io::Cursor, path::PathBuf};

use rocket::{
  fs::NamedFile,
  http::{HeaderMap, Status},
  request::{self, FromRequest, Outcome},
  response::{self, Redirect, Responder},
  Request,
};
use rocket_governor::RocketGovernor;
use tokio::io::AsyncReadExt;

use crate::{
  file_type::FileType,
  utils::{get_software_description, get_software_name},
};

use super::{
  download::{file::download_file, info::get_file_download_info, DownloadResponse},
  AuthError, RelaxedRateLimitGuard, TokenAuth,
};

const PRIVATE_STYLES: [&str; 9] = [
  "aside",
  "dashboard",
  "medal",
  "modulecard",
  "private-common",
  "upload",
  "UploadPage",
  "uploadwidget",
  "youtube",
];

const PRIVATE_ASSETS: [&str; 7] = [
  "ChipsSelect",
  "DashboardPage",
  "MedalPage",
  "PageWrapper",
  "private",
  "UploadPage",
  "YoutubePage",
];

// MARK: Models
pub struct RequestHeaders<'h>(&'h HeaderMap<'h>);

#[rocket::async_trait]
impl<'r> FromRequest<'r> for RequestHeaders<'r> {
  type Error = Infallible;

  async fn from_request(request: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
    let request_headers = request.headers();
    Outcome::Success(RequestHeaders(request_headers))
  }
}

pub enum FilePageResponse {
  Raw(DownloadResponse),
  Html(MetaHtmlResponse),
}

impl<'r, 'o: 'r> Responder<'r, 'o> for FilePageResponse {
  fn respond_to(self, req: &'r Request<'_>) -> response::Result<'o> {
    match self {
      FilePageResponse::Raw(res) => res.respond_to(req),
      FilePageResponse::Html(res) => res.respond_to(req),
    }
  }
}

// MARK: MetaTags
pub struct MetaTag {
  pub name: String,
  pub content: String,
}

#[derive(Default)]
pub struct MetaHtmlResponse {
  pub title: Option<String>,
  pub description: Option<String>,
  pub meta: Vec<MetaTag>,
  pub content: String,
}

impl MetaHtmlResponse {
  pub async fn open(path: &str) -> Result<Self, std::io::Error> {
    let mut file = tokio::fs::File::open(path).await?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).await?;

    Ok(Self {
      content: contents,
      ..Default::default()
    })
  }

  pub fn with_title(mut self, title: String) -> Self {
    self.title = Some(title);
    self
  }

  pub fn with_description(mut self, description: String) -> Self {
    self.description = Some(description);
    self
  }

  pub fn with_meta(mut self, meta: MetaTag) -> Self {
    // Check if the meta already exists
    let existing_index = self.meta.iter().position(|m| m.name == meta.name);

    // If it exists, replace it
    if let Some(index) = existing_index {
      self.meta[index] = meta;
    } else {
      self.meta.push(meta);
    }

    self
  }

  pub fn with_default_meta(self) -> Self {
    self
      .with_meta(MetaTag {
        name: "repository".to_string(),
        content: env!("CARGO_PKG_REPOSITORY").to_string(),
      })
      .with_meta(MetaTag {
        name: "og:site_name".to_string(),
        content: get_software_name(),
      })
      .with_meta(MetaTag {
        name: "theme-color".to_string(),
        content: "#b79fef".to_string(),
      })
      .with_description(get_software_description())
  }
}

impl<'r, 'o: 'r> response::Responder<'r, 'o> for MetaHtmlResponse {
  fn respond_to(self, _: &Request) -> rocket::response::Result<'o> {
    let mut modified_content = self.content.clone();
    let mut meta_string = String::new();
    for meta in self.meta {
      meta_string.push_str(&format!(
        "<meta name=\"{}\" property=\"{}\" content=\"{}\" />\n",
        meta.name, meta.name, meta.content
      ));
    }
    if let Some(description) = self.description {
      meta_string.push_str(&format!(
        "<meta name=\"description\" content=\"{}\" />\n",
        description
      ));
    }

    if let Some(title) = self.title {
      // regex to find <title>ANY</title>
      let re = regex::Regex::new(r#"<title>(.*?)</title>"#).unwrap();
      modified_content = re
        .replace_all(&modified_content, format!("<title>{}</title>", title))
        .to_string();

      meta_string.push_str(&format!(
        "<meta name=\"og:title\" content=\"{}\" />\n",
        title
      ));
    }

    modified_content = modified_content.replace("<!-- meta -->", &meta_string);

    let mut res = rocket::response::Response::new();
    res.set_header(rocket::http::ContentType::HTML);
    res.set_header(rocket::http::Header::new("Cache-Control", "no-cache"));
    res.set_raw_header(
      "x-server",
      option_env!("CARGO_PKG_NAME").unwrap_or("RIST").to_string(),
    );
    res.set_sized_body(modified_content.len(), Cursor::new(modified_content));
    Ok(res)
  }
}

// MARK: Pages
#[get("/")]
pub async fn index<'r>(
  _brl: RocketGovernor<'r, RelaxedRateLimitGuard>,
) -> Result<MetaHtmlResponse, Status> {
  MetaHtmlResponse::open("frontend/index.html")
    .await
    .map_err(|_| Status::InternalServerError)
    .map(|res| {
      res
        .with_title(get_software_name().to_string())
        .with_default_meta()
    })
}

#[get("/authorize")]
pub async fn authorize_page<'r>(
  _brl: RocketGovernor<'r, RelaxedRateLimitGuard>,
) -> Result<MetaHtmlResponse, Status> {
  MetaHtmlResponse::open("frontend/index.html")
    .await
    .map_err(|_| Status::InternalServerError)
    .map(|res| {
      res
        .with_title(format!("Authorize | {}", get_software_name()))
        .with_default_meta()
    })
}

#[get("/f?<u>")]
pub async fn file_page<'r, 'o: 'r>(
  _brl: RocketGovernor<'r, RelaxedRateLimitGuard>,
  headers: RequestHeaders<'o>,
  u: Option<&str>,
) -> Result<FilePageResponse, Status> {
  all_file_page(headers, u).await
}

#[get("/f/<u>")]
pub async fn file_page_short<'r, 'o: 'r>(
  _brl: RocketGovernor<'r, RelaxedRateLimitGuard>,
  headers: RequestHeaders<'o>,
  u: Option<&str>,
) -> Result<FilePageResponse, Status> {
  all_file_page(headers, u).await
}

pub async fn all_file_page<'r>(
  headers: RequestHeaders<'r>,
  u: Option<&str>,
) -> Result<FilePageResponse, Status> {
  let uuid = u;

  // Check if headers include (content-type = octet-stream)
  if let Some(content_type) = headers.0.get_one("content-type") {
    if content_type == "application/octet-stream" {
      if let Some(uuid) = uuid {
        return download_file(uuid)
            .await
            .map(FilePageResponse::Raw)
            .map_err(|_| Status::InternalServerError);
      }
    }
  }

  let download_info = match uuid {
    Some(uuid) => get_file_download_info(uuid).await.ok(),
    None => None,
  };

  MetaHtmlResponse::open("frontend/index.html")
      .await
      .map_err(|_| Status::InternalServerError)
      .map(|res| match download_info {
        Some(info) => {
          let file_property = match info.file_type {
            FileType::Audio(_) => "audio",
            FileType::Video(_) => "video",
            FileType::Image(_) => "image",
            FileType::Unknown => "file",
          };
          res
              .with_title(format!("File {} | {}", info.filename, get_software_name()))
              .with_default_meta()
              .with_meta(MetaTag {
                name: "filename".to_string(),
                content: info.filename,
              })
              .with_meta(MetaTag {
                name: "filetype".to_string(),
                content: info.file_type.to_mime_type(),
              })
              .with_meta(MetaTag {
                name: format!("og:{}:type", file_property),
                content: info.file_type.to_mime_type(),
              })
              .with_meta(MetaTag {
                name: format!("og:{}", file_property),
                content: format!("/api/download/raw/{}", info.uuid),
              })
              .with_meta(MetaTag {
                name: format!("twitter:{}", file_property),
                content: format!("/api/download/raw/{}", info.uuid),
              })
              .with_meta(MetaTag {
                name: "twitter:card".to_string(),
                content: "summary_large_image".to_string(),
              })
        }
        None => res
            .with_title(format!("File | {}", get_software_name()))
            .with_default_meta(),
      })
      .map(FilePageResponse::Html)
}

#[get("/robots.txt")]
pub async fn robots_txt<'r>(
  _brl: RocketGovernor<'r, RelaxedRateLimitGuard>,
) -> Result<String, Status> {
  Ok("User-agent: *\nDisallow: /".to_string())
}

#[get("/dash")]
pub async fn dashboard_page<'r>(
  _brl: RocketGovernor<'r, RelaxedRateLimitGuard>,
  auth: Result<TokenAuth, AuthError>,
) -> Result<MetaHtmlResponse, Redirect> {
  if auth.is_err() {
    // Redirect to authorize page
    return Err(Redirect::to(
      "/authorize?msg=You%20are%20not%20authorized%20to%20access%20this%20page.&local=false&redirect=%2Fdash%2F"
    ));
  }

  MetaHtmlResponse::open("frontend/index.html")
    .await
    .map_err(|_| {
      Redirect::to("/authorize?msg=There%20was%20an%20error%20while%20loading%20a%20dash%20page.")
    })
    .map(|res| {
      res
        .with_title(format!("Dashboard | {}", get_software_name()))
        .with_default_meta()
    })
}

#[get("/dash/<page>")]
pub async fn dashboard_pages<'r>(
  _brl: RocketGovernor<'r, RelaxedRateLimitGuard>,
  auth: Result<TokenAuth, AuthError>,
  page: &str,
) -> Result<MetaHtmlResponse, Redirect> {
  if auth.is_err() {
    // Redirect to authorize page
    return Err(Redirect::to(format!(
      "/authorize?msg=You%20are%20not%20authorized%20to%20access%20this%20page.&local=false&redirect=%2Fdash%2F{}", page
    )));
  }

  MetaHtmlResponse::open("frontend/index.html")
    .await
    .map_err(|_| {
      Redirect::to("/authorize?msg=There%20was%20an%20error%20while%20loading%20a%20dash%20page.")
    })
    .map(|res| {
      res
        .with_title(format!(
          "{} Dashboard | {}",
          page.to_uppercase(),
          get_software_name()
        ))
        .with_default_meta()
    })
}

// MARK: Styles
#[get("/styles/<file..>", rank = 1)]
pub async fn styles<'r>(
  _brl: RocketGovernor<'r, RelaxedRateLimitGuard>,
  auth: Result<TokenAuth, AuthError>,
  file: PathBuf,
) -> Option<NamedFile> {
  if PRIVATE_STYLES
    .iter()
    .any(|style| file.to_str().unwrap().starts_with(style))
  {
    if auth.is_err() {
      return None;
    }
  }
  NamedFile::open(format!("frontend/styles/{}", file.to_str().unwrap()))
    .await
    .ok()
}

// MARK: Assets
#[get("/assets/<file..>", rank = 2)]
pub async fn assets<'r>(
  _brl: RocketGovernor<'r, RelaxedRateLimitGuard>,
  auth: Result<TokenAuth, AuthError>,
  file: PathBuf,
) -> Option<NamedFile> {
  let file_str = file.to_str().unwrap();

  if file_str.ends_with(".map") {
    return None;
  }

  if PRIVATE_ASSETS
    .iter()
    .any(|asset| file_str.starts_with(asset))
  {
    if auth.is_err() {
      return None;
    }
  }
  NamedFile::open(format!("frontend/assets/{}", file_str))
    .await
    .ok()
}
