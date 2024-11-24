use core::str;
use std::{collections::HashMap, fs, io::Cursor, path::Path};

use rocket::{
  http::{ContentType, Status},
  response,
  serde::json::Json,
  Request, Response,
};
use rocket_governor::RocketGovernor;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::process::Command;
use uuid::Uuid;

use crate::{
  db::{
    user::PermissionKind,
    video::{Video, YoutubeKind, YoutubeQuality},
  },
  file_type::{AudioType, FileType, VideoType},
  module::{GetModule, Module},
  routes::{StandardRateLimitGuard, TokenAuth},
  state, utils,
};

use super::upload::UploadMethod;

// MARK: Module
pub struct YoutubeModule;

impl GetModule for YoutubeModule {
  async fn get_module() -> Module {
    let mut routes: HashMap<String, String> = HashMap::new();
    routes.insert(
      "YOUTUBE_REQUEST".to_string(),
      "/api/youtube/request".to_string(),
    );
    routes.insert(
      "YOUTUBE_DOWNLOAD".to_string(),
      "/api/youtube/download/<uuid>".to_string(),
    );

    Module {
      name: "Yt-dlp Download".to_string(),
      api_routes: routes,
      version: "0.0.1".to_string(),
      summary: "Download files from YouTube using yt-dlp".to_string(),
      icon_name: "youtube".to_string(),
      module_dash_url: "yt".to_string(),
      permissions: PermissionKind::YoutubeDownload,
    }
  }
}

// MARK: Models

#[derive(Deserialize)]
pub struct YoutubeRequest {
  kind: YoutubeKind,
  quality: YoutubeQuality,
}

#[derive(Debug)]
pub enum YoutubeResponseKind {
  Good(YoutubeRequestResponse),
  Bad(YoutubeError),
}

impl YoutubeResponseKind {
  pub fn default() -> Self {
    Self::Good(YoutubeRequestResponse {
      found: false,
      uuid: String::new(),
    })
  }
}

#[derive(Debug)]
pub struct YoutubeRequestResponse {
  pub found: bool,
  pub uuid: String,
}

#[derive(Debug, Serialize)]
pub enum YoutubeErrorKind {
  Unknown,
  InvalidUuid,
  InvalidDataSupplied,
  OperationCanceled,
  VideoNotFound,
  AlreadyInProgress,
  ServerIssue,
  InvalidUser,
  NoPermissions,
}

#[derive(Debug, Serialize)]
pub struct YoutubeError {
  pub kind: YoutubeErrorKind,
  pub status: Status,
  pub message: String,
}

pub struct YoutubeOutput {
  pub uuid: String,
  pub name: String,
  pub kind: YoutubeKind,
}

// MARK: Responders
#[rocket::async_trait]
impl<'r, 'o: 'r> response::Responder<'r, 'o> for YoutubeResponseKind {
  fn respond_to(self, req: &Request) -> rocket::response::Result<'o> {
    match self {
      YoutubeResponseKind::Good(good) => good.respond_to(req),
      YoutubeResponseKind::Bad(bad) => bad.respond_to(req),
    }
  }
}

impl<'r, 'o: 'r> response::Responder<'r, 'o> for YoutubeRequestResponse {
  fn respond_to(self, _: &Request) -> rocket::response::Result<'o> {
    let mut res = Response::new();

    res.set_header(ContentType::new("application", "json"));
    let body = format!(r#"{{"found": {}, "uuid": "{}"}}"#, self.found, self.uuid);
    res.set_sized_body(body.len(), Cursor::new(body));
    Ok(res)
  }
}

impl<'r, 'o: 'r> response::Responder<'r, 'o> for YoutubeError {
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

impl<'r, 'o: 'r> response::Responder<'r, 'o> for YoutubeOutput {
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

// MARK: Youtube request
#[post("/api/youtube/request?<url>", format = "json", data = "<data>")]
pub async fn youtube_request<'r>(
  _rt: RocketGovernor<'r, StandardRateLimitGuard>,
  auth: TokenAuth,
  url: String,
  data: Json<YoutubeRequest>,
) -> YoutubeResponseKind {
  if !auth.0.has_permissions_to(PermissionKind::YoutubeDownload) {
    return YoutubeResponseKind::Bad(YoutubeError {
      kind: YoutubeErrorKind::NoPermissions,
      status: Status::Forbidden,
      message: String::from("No permissions"),
    });
  }

  if url.is_empty() || url.len() <= 20 || !url.starts_with("http") {
    return YoutubeResponseKind::Bad(YoutubeError {
      kind: YoutubeErrorKind::InvalidDataSupplied,
      status: Status::BadRequest,
      message: String::from("Invalid data supplied, url is empty, incorrect or too short"),
    });
  }

  let state = match state::State::get().await {
    Ok(state) => state,
    Err(_) => {
      return YoutubeResponseKind::Bad(YoutubeError {
        kind: YoutubeErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: String::from("Server issue"),
      });
    }
  };

  if !state.config.yt_dlp.enabled || state.config.yt_dlp.dpl_exec_path.is_empty() {
    return YoutubeResponseKind::Bad(YoutubeError {
      kind: YoutubeErrorKind::ServerIssue,
      status: Status::InternalServerError,
      message: String::from("yt-dlp is not enabled"),
    });
  }

  // Check if the video exists on youtube
  let output = Command::new(state.config.yt_dlp.dpl_exec_path.clone())
    .arg("--simulate")
    .arg("-j")
    .arg(url)
    .output()
    .await
    .expect("Failed to execute yt-dlp");

  if !output.status.success() {
    return YoutubeResponseKind::Bad(YoutubeError {
      kind: YoutubeErrorKind::VideoNotFound,
      status: Status::NotFound,
      message: String::from("Failed to find video, or server failed to execute yt-dlp"),
    });
  }

  let json_output = str::from_utf8(&output.stdout)
    .map_err(|e| {
      YoutubeResponseKind::Bad(YoutubeError {
        kind: YoutubeErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: e.to_string(),
      })
    })
    .unwrap()
    .trim()
    .to_string();
  let video_info: Value = serde_json::from_str(&json_output)
    .map_err(|_| {
      YoutubeResponseKind::Bad(YoutubeError {
        kind: YoutubeErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: format!("Failed to parse yt-dlp output: {}", &json_output),
      })
    })
    .unwrap();

  let mut video = Video::from_yt_json(video_info)
    .map_err(|e| {
      YoutubeResponseKind::Bad(YoutubeError {
        kind: YoutubeErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: e.to_string(),
      })
    })
    .unwrap();

  let uuid = Uuid::new_v4().to_string();
  video.uuid = uuid.clone();
  video.user = auth.0.id.clone();
  video.quality = data.0.quality.to_u8();
  video.format = data.0.kind.to_u8();

  state
    .video_db
    .add(&video)
    .await
    .map_err(|e| {
      eprintln!("[ERROR] Database 'VideoDB' failed to add video: {}", e);
      YoutubeResponseKind::Bad(YoutubeError {
        kind: YoutubeErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: e.to_string(),
      })
    })
    .unwrap();

  YoutubeResponseKind::Good(YoutubeRequestResponse { found: true, uuid })
}

// MARK: Youtube download
#[get("/api/youtube/download/<uuid>")]
pub async fn youtube_download<'r>(
  _rt: RocketGovernor<'r, StandardRateLimitGuard>,
  auth: TokenAuth,
  uuid: &str,
) -> Result<YoutubeOutput, YoutubeError> {
  if !auth.0.has_permissions_to(PermissionKind::YoutubeDownload) {
    return Err(YoutubeError {
      kind: YoutubeErrorKind::NoPermissions,
      status: Status::Forbidden,
      message: String::from("No permissions"),
    });
  }

  let state = match state::State::get().await {
    Ok(state) => state,
    Err(_) => {
      return Err(YoutubeError {
        kind: YoutubeErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: String::from("Server issue"),
      });
    }
  };

  let mut video = match state.video_db.get_by_uuid(&uuid).await {
    Ok(video) => match video {
      Some(vid) => vid,
      None => {
        return Err(YoutubeError {
          kind: YoutubeErrorKind::VideoNotFound,
          status: Status::NotFound,
          message: String::from("Video not found"),
        });
      }
    },
    Err(e) => {
      eprintln!("[ERROR] Database 'VideoDB' failed to get video: {}", e);
      return Err(YoutubeError {
        kind: YoutubeErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: e.to_string(),
      });
    }
  };

  if video.user != auth.0.id {
    return Err(YoutubeError {
      kind: YoutubeErrorKind::InvalidUser,
      status: Status::Forbidden,
      message: String::from("You can only download from your own requests"),
    });
  }

  let url = format!("https://www.youtube.com/watch?v={}", video.vid_id);

  let path_str = Path::new(&state.config.upload.upload_location)
    .join(format!("{}-{}", &video.uuid, &video.vid_id))
    .to_string_lossy()
    .into_owned();
  let path = Path::new(path_str.as_str());
  let quality = YoutubeQuality::from_u8(video.quality);
  let format = YoutubeKind::from_u8(video.format);

  let dpl_exec_path = state.config.yt_dlp.dpl_exec_path.clone();
  let mut cmd = Command::new(dpl_exec_path);
  cmd.arg("-o");
  cmd.arg(&path);

  if format.is_audio() {
    cmd
      .arg("--extract-audio")
      .arg("--audio-format")
      .arg(format.as_str());
  }

  if quality.use_selection() {
    if format.is_audio() {
      cmd.arg("-S").arg(quality.as_str_audio());
    } else {
      cmd.arg("-S").arg(quality.as_str_vid());
    }
  } else {
    if format.is_audio() {
      cmd.arg("--audio-quality").arg(quality.as_str_audio());
    }
    cmd.arg("--format").arg(quality.as_str_vid());
  }

  cmd.arg(url);

  let mut output = match cmd.spawn() {
    Ok(output) => output,
    Err(e) => {
      eprintln!("[ERROR] yt-dlp failed to start: {}", e);
      return Err(YoutubeError {
        kind: YoutubeErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: e.to_string(),
      });
    }
  };

  if let Err(e) = output.wait().await {
    eprintln!("[ERROR] yt-dlp failed to wait: {}", e);
    return Err(YoutubeError {
      kind: YoutubeErrorKind::ServerIssue,
      status: Status::InternalServerError,
      message: e.to_string(),
    });
  }

  let complete_path = match utils::get_file_with_extension(&path_str) {
    Ok(val) => val.unwrap(),
    Err(e) => {
      eprintln!("Failed to get file with extension: {}", e);
      return Err(YoutubeError {
        kind: YoutubeErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: e.to_string(),
      });
    }
  };

  video.path = complete_path.clone().to_str().unwrap().to_string();

  match state.video_db.update_data(&video.uuid, &video).await {
    Ok(_) => {}
    Err(e) => {
      eprintln!("[ERROR] Database 'VideoDB' failed to update video: {}", e);
      return Err(YoutubeError {
        kind: YoutubeErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: e.to_string(),
      });
    }
  }

  // Get fs file info
  let metadata = match fs::metadata(&complete_path) {
    Ok(val) => val,
    Err(e) => {
      eprintln!("[ERROR] Failed to get file metadata (yt): {}", e);
      return Err(YoutubeError {
        kind: YoutubeErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: e.to_string(),
      });
    }
  };

  match state
    .file_db
    .add_and_get_from_request(
      &video.uuid,
      video.name.clone(),
      metadata.len(),
      utils::get_current_timestamp() + 65_321,
      UploadMethod::Url,
      true,
    )
    .await
  {
    Ok(db_file) => {
      let mut db_file = db_file.unwrap();
      db_file.path = complete_path.to_string_lossy().to_string();
      db_file.file_type = Some(match format {
        YoutubeKind::Video => FileType::Video(VideoType::MP4),
        YoutubeKind::AudioWav => FileType::Audio(AudioType::WAV),
        YoutubeKind::AudioMp3 => FileType::Audio(AudioType::MP3),
      });

      match state.file_db.update_data(&video.uuid, db_file).await {
        Ok(_) => {}
        Err(e) => {
          eprintln!("[ERROR] Database 'FileDB' failed to update file: {}", e);
          return Err(YoutubeError {
            kind: YoutubeErrorKind::ServerIssue,
            status: Status::InternalServerError,
            message: e.to_string(),
          });
        }
      }
    }
    Err(err) => {
      eprintln!("[ERROR] Database 'FileDB' failed to add file: {}", err);
      return Err(YoutubeError {
        kind: YoutubeErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: err.to_string(),
      });
    }
  }

  Ok(YoutubeOutput {
    uuid: uuid.to_string(),
    name: video.name,
    kind: format,
  })
}
