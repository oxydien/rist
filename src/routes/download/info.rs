use rocket::{data::ToByteUnit, http::Status};
use serde::Serialize;

use crate::{db::file::FileState, file_type::FileType, get_state, routes::upload::{part::CHUNK_SIZE, UploadMethod}, state::State};

use super::{DownloadError, DownloadErrorKind};

#[derive(Debug, Serialize)]
pub struct DownloadFileInfo {
  pub uuid: String,
  pub recommended_method: UploadMethod,
  pub filename: String,
  pub file_type: FileType,
  pub size: u64,
  pub parts: Option<u64>,
  pub ready: bool,
}

pub async fn get_file_download_info(search_query: &str) -> Result<DownloadFileInfo, DownloadError> {
  let state = get_state!();

  let output = state.file_db.get_by_uuid_or_shortened(search_query).await;

  let info: DownloadFileInfo = match output {
    Ok(db_file) => match db_file {
      Some(db_file) => {
        let method = if db_file.size > 40.megabytes() {
          UploadMethod::Chunked
        } else {
          UploadMethod::EntireContent
        };

        let parts = if method == UploadMethod::Chunked && db_file.size > 0 {
          Some((db_file.size as u64) / CHUNK_SIZE)
        } else {
          None
        };

        DownloadFileInfo {
          uuid: db_file.uuid,
          recommended_method: method,
          filename: db_file.name,
          file_type: db_file.file_type.unwrap_or(FileType::Unknown),
          size: db_file.size as u64,
          parts,
          ready: db_file.state == FileState::Completed,
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
