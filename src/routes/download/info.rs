use rocket::{data::ToByteUnit, http::Status};
use serde::Serialize;

use crate::{db::file::FileState, file_type::FileType, routes::upload::{part::CHUNK_SIZE, UploadMethod}, state::State};

use super::{DownloadError, DownloadErrorKind};

#[derive(Serialize)]
pub struct DownloadFileInfo {
  pub uuid: String,
  pub recommended_method: UploadMethod,
  pub filename: String,
  pub file_type: FileType,
  pub size: u64,
  pub parts: Option<u64>,
  pub ready: bool,
}

pub async fn get_file_download_info(uuid: &str) -> Result<DownloadFileInfo, DownloadError> {
  let state = match State::get().await {
    Ok(state) => state,
    Err(_) => {
      return Err(DownloadError {
        status: Status::InternalServerError,
        kind: DownloadErrorKind::InternalError,
        message: String::from("Internal state error"),
      });
    }
  };

  let output = state.file_db.get_by_uuid(uuid).await;

  let info: DownloadFileInfo = match output {
    Ok(file) => match file {
      Some(file) => {
        let method = if file.size > 40.megabytes() {
          UploadMethod::Chunked
        } else {
          UploadMethod::EntireContent
        };

        let parts = if method == UploadMethod::Chunked && file.size > 0 {
          Some((file.size as u64) / CHUNK_SIZE)
        } else {
          None
        };

        DownloadFileInfo {
          uuid: file.uuid,
          recommended_method: method,
          filename: file.name,
          file_type: file.file_type.unwrap_or(FileType::Unknown),
          size: file.size as u64,
          parts,
          ready: file.state == FileState::Completed,
        }
      }
      None => {
        return Err(DownloadError {
          status: Status::NotFound,
          kind: DownloadErrorKind::NotFound,
          message: String::from("File not found"),
        })
      }
    },
    Err(_) => {
      return Err(DownloadError {
        status: Status::InternalServerError,
        kind: DownloadErrorKind::InternalError,
        message: String::from("Internal db error"),
      });
    }
  };

  Ok(info)
}
