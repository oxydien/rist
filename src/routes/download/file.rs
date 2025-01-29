use std::{io::Read, path::Path};

use rocket::http::Status;

use crate::{db::file::FileState, state::State};

use super::{DownloadError, DownloadErrorKind, DownloadResponse};

pub async fn download_file(uuid: &str) -> Result<DownloadResponse, DownloadError> {
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

  match state.upload_status.read().await.get(uuid) {
    Some(file_status) if file_status.state == FileState::Completed => (),
    Some(_) => {
      return Err(DownloadError {
        status: Status::Forbidden,
        kind: DownloadErrorKind::NotReady,
        message: String::from("File is not ready to be downloaded"),
      })
    }
    None => {}
  }

  let db_file = match state.file_db.get_by_uuid(uuid).await {
    Ok(file) => match file {
      Some(file) => file,
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
        message: String::from("Internal state error"),
      });
    }
  };

  let path = Path::new(&db_file.path);

  let mut content = Vec::new();
  let mut file = match std::fs::File::open(path) {
    Ok(file) => file,
    Err(e) => {
      eprintln!("Failed to read file at {:?}: {}", path, e);
      return Err(DownloadError {
        status: Status::InternalServerError,
        kind: DownloadErrorKind::InternalError,
        message: "Failed to open file".to_string(),
      });
    }
  };

  match file.read_to_end(&mut content) {
    Ok(_) => {}
    Err(e) => {
      eprintln!("Failed to read file at {:?}: {}", path, e);
      return Err(DownloadError {
        status: Status::InternalServerError,
        kind: DownloadErrorKind::InternalError,
        message: "Failed to read file".to_string(),
      });
    }
  }

  match state.file_db.increment_access_count(&uuid).await {
    Ok(_) => {}
    Err(_) => {
      return Err(DownloadError {
        status: Status::InternalServerError,
        kind: DownloadErrorKind::InternalError,
        message: "Failed to increment access count".to_string(),
      });
    }
  }

  Ok(DownloadResponse {
    found: true,
    finished: true,
    filename: db_file.name,
    data: content,
    file_type: db_file
      .file_type
      .unwrap_or(crate::file_type::FileType::Unknown),
  })
}
