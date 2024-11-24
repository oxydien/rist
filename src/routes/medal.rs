use std::{
  collections::HashMap,
  io::Cursor,
};

use regex::Regex;
use rocket::{
  http::{ContentType, Status},
  response, Request, Response,
};
use rocket_governor::RocketGovernor;
use serde::Serialize;
use serde_json::{json, Value};

use crate::{
  db::user::PermissionKind,
  module::{GetModule, Module},
  utils,
};

use super::{upload::url::upload_from_url, StrictRateLimitGuard, TokenAuth};

// MARK: Module
pub struct MedalModule;
impl GetModule for MedalModule {
  async fn get_module() -> Module {
    let mut routes: HashMap<String, String> = HashMap::new();
    routes.insert("MEDAL_DOWNLOAD".to_string(), "/api/medal".to_string());

    Module {
      name: "Medal Download".to_string(),
      api_routes: routes,
      version: "0.0.1".to_string(),
      summary: "Download your Medal clips without the watermark".to_string(),
      icon_name: "medal".to_string(),
      module_dash_url: "medal".to_string(),
      permissions: PermissionKind::MedalDownload,
    }
  }
}

// MARK: Models
pub enum MedalResponse {
  Ok(MedalOutput),
  Error(MedalError),
}

#[derive(Serialize)]
pub struct MedalOutput {
  pub uuid: String,
  pub name: String,
}

#[derive(Serialize)]
pub struct MedalError {
  pub kind: MedalErrorKind,
  pub status: Status,
  pub message: String,
}

#[derive(Serialize)]
pub enum MedalErrorKind {
  Unknown,
  MedalIgnoredRequest,
  MedalReturnedError,
  MedalNoBody,
  NoDataFound,
  MedalInvalidData,
  NoClipsFound,
  MissingClipContent,
  DownloadFailed,
  ServerIssue,
  NoPermissions,
}

// MARK: Responders
impl<'r, 'o: 'r> response::Responder<'r, 'o> for MedalResponse {
  fn respond_to(self, req: &Request) -> rocket::response::Result<'o> {
    match self {
      Self::Ok(output) => output.respond_to(req),
      Self::Error(error) => error.respond_to(req),
    }
  }
}

impl<'r, 'o: 'r> response::Responder<'r, 'o> for MedalError {
  fn respond_to(self, _: &Request) -> rocket::response::Result<'o> {
    let mut res = Response::new();
    res.set_status(self.status);

    let body = json!({
        "status": self.status.code,
        "error": self.kind,
        "message": self.message
    })
    .to_string();
    res.set_sized_body(body.len(), Cursor::new(body));
    res.set_header(ContentType::new("application", "json"));
    Ok(res)
  }
}

impl<'r, 'o: 'r> response::Responder<'r, 'o> for MedalOutput {
  fn respond_to(self, _: &Request) -> rocket::response::Result<'o> {
    let mut res = Response::new();

    let body = json!({
        "uuid": self.uuid,
        "name": self.name
    })
    .to_string();
    res.set_sized_body(body.len(), Cursor::new(body));
    res.set_header(ContentType::new("application", "json"));
    Ok(res)
  }
}

// MARK: Download medal clip
#[get("/api/medal?<url>&<quality>")]
pub async fn download_medal_clip(
  _srt: RocketGovernor<'_, StrictRateLimitGuard>,
  auth: TokenAuth,
  url: &str,
  quality: Option<u8>,
) -> MedalResponse {
  if !auth.0.has_permissions_to(PermissionKind::MedalDownload) {
    return MedalResponse::Error(MedalError {
      kind: MedalErrorKind::NoPermissions,
      status: Status::Forbidden,
      message: "You do not have permission to download medal clips".to_string(),
    });
  }

  if url.is_empty() || url.len() < 20 || !url.starts_with("https://medal.tv") {
    return MedalResponse::Error(MedalError {
      kind: MedalErrorKind::NoDataFound,
      status: Status::NotFound,
      message: "Invalid URL supplied".to_string(),
    });
  }

  let quality_str = match quality {
    Some(val) => match val {
      0 => "144p".to_string(),
      1 => "360p".to_string(),
      2 => "720p".to_string(),
      3 => "1080p".to_string(),
      4 => "".to_string(), // original quality
      _ => "720p".to_string(),
    },
    None => "720p".to_string(),
  };

  // - Request base url
  let client = reqwest::Client::new();
  let request = match client.get(url)
    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3")
    .header("Referer", "https://medal.tv/") // ;)
    .build() {
    Ok(val) => val,
    Err(e) => {
      eprintln!("Failed to create a request: {}", e);
      return MedalResponse::Error(MedalError {
        kind: MedalErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: e.to_string(),
      });
    }
  };

  let response = match client.execute(request).await {
    Ok(val) => val,
    Err(e) => {
      eprintln!("Medal ignored request: {}", e);
      return MedalResponse::Error(MedalError {
        kind: MedalErrorKind::MedalIgnoredRequest,
        status: Status::InternalServerError,
        message: e.to_string(),
      });
    }
  };

  if !response.status().is_success() {
    return MedalResponse::Error(MedalError {
      kind: MedalErrorKind::MedalReturnedError,
      status: Status::NotFound,
      message: format!("Medal returned an error with status: {}", response.status()),
    });
  }

  let body = match response.text().await {
    Ok(val) => val,
    Err(e) => {
      eprintln!("Failed to read response body: {}", e);
      return MedalResponse::Error(MedalError {
        kind: MedalErrorKind::MedalNoBody,
        status: Status::InternalServerError,
        message: e.to_string(),
      });
    }
  };

  // - Search for hydration data
  let hydration_data_re = Regex::new(r#"var hydrationData=(\{.*\})"#).unwrap();
  let script_tag = match hydration_data_re.captures(&body) {
    Some(caps) => caps.get(1).map_or("", |m| m.as_str()),
    None => {
      return MedalResponse::Error(MedalError {
        kind: MedalErrorKind::NoDataFound,
        status: Status::NotFound,
        message: "Could not find hydration data in response".to_string(),
      });
    }
  };

  let hydration_data = match serde_json::from_str::<Value>(script_tag) {
    Ok(data) => data,
    Err(e) => {
      eprintln!("Failed to parse hydration data: {}", e);
      return MedalResponse::Error(MedalError {
        kind: MedalErrorKind::MedalInvalidData,
        status: Status::NotFound,
        message: "Failed to parse hydration data".to_string(),
      });
    }
  };

  let first_clip_id = match hydration_data["clips"].as_object() {
    Some(clips) => match clips.keys().next() {
      Some(id) => id,
      None => {
        return MedalResponse::Error(MedalError {
          kind: MedalErrorKind::NoClipsFound,
          status: Status::NotFound,
          message: "Could not find any clips in hydration data".to_string(),
        });
      }
    },
    None => {
      return MedalResponse::Error(MedalError {
        kind: MedalErrorKind::NoClipsFound,
        status: Status::NotFound,
        message: "Could not find any clip objects in hydration data".to_string(),
      });
    }
  };

  let title = match hydration_data["clips"][first_clip_id]["contentTitle"].as_str() {
    Some(title) => title,
    None => {
      return MedalResponse::Error(MedalError {
        kind: MedalErrorKind::MedalInvalidData,
        status: Status::NotFound,
        message: "Could not find title in hydration data".to_string(),
      });
    }
  };

  // - Get content url from hydration data
  let content_search_str = format!("contentUrl{}", &quality_str);
  let content_url = match hydration_data["clips"][first_clip_id][content_search_str].as_str() {
    Some(url) => url.replace("144", &quality_str),
    None => {
      return MedalResponse::Error(MedalError {
        kind: MedalErrorKind::MissingClipContent,
        status: Status::NotFound,
        message: "Could not find contentUrl in hydration data".to_string(),
      });
    }
  };

  let expiration = utils::get_current_timestamp() + 65_321;

  // Download the clip
  println!("[INFO   ] Downloading medal clip from: {}", &content_url);
  let upload_response = upload_from_url(content_url, expiration, Some(title.to_string())).await;

  match upload_response {
    Ok(response) => {
      println!("[INFO   ] Medal clip uploaded to: {}", &response.0.uuid);
      MedalResponse::Ok(MedalOutput {
        uuid: response.0.uuid,
        name: title.to_string(),
      })
    }
    Err(e) => {
      println!("[ERROR  ] Failed to upload medal clip: {}", e);
      MedalResponse::Error(MedalError {
        kind: MedalErrorKind::DownloadFailed,
        status: Status::InternalServerError,
        message: e.to_string(),
      })
    }
  }
}
