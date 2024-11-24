use std::path::Path;

use rocket::http::Status;
use tokio::io::{AsyncReadExt, AsyncSeekExt};

use crate::{db::file::FileState, file_type::FileType, routes::upload::part::CHUNK_SIZE, state::State};

use super::{DownloadError, DownloadErrorKind, DownloadResponse};


/// Download a single part
/// 
/// ## Arguments
/// - `uuid`: The UUID of the file
/// - `part`: The part number (from 0 to the total number of parts)
pub async  fn download_part(uuid: &str, part: u32) -> Result<DownloadResponse, DownloadError> {
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
      return Err(
        DownloadError {
          status: Status::Forbidden,
          kind: DownloadErrorKind::NotReady,
          message: String::from("File is not ready to be downloaded"),
        }
      )
    },
    None => {}
  }

  let offset = (CHUNK_SIZE * (part as u64)) as u64;

  let db_file = match state.file_db.get_by_uuid(uuid).await {
    Ok(file) => match file {
      Some(file) => file,
      None => {
        return Err(
          DownloadError {
            status: Status::NotFound,
            kind: DownloadErrorKind::NotFound,
            message: String::from("File not found"),
          }
        )
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

  if (db_file.size as u64) < offset {
    return Err(
      DownloadError {
        status: Status::BadRequest,
        kind: DownloadErrorKind::InvalidPartNumber,
        message: String::from("The part number is invalid; (0 to the number of parts). Check file info route."),
      }
    )
  }

  let file_path = Path::new(&db_file.path);

  let mut file = match tokio::fs::File::open(&file_path).await {
    Ok(file) => file,
    Err(_) => {
      return Err(DownloadError {
        status: Status::InternalServerError,
        kind: DownloadErrorKind::InternalError,
        message: String::from("Failed to open file"),
      });
    }
  };

  let mut data = Vec::with_capacity(CHUNK_SIZE as usize);
  if let Err(_) = file.seek(std::io::SeekFrom::Start(offset)).await {
    return Err(DownloadError {
      status: Status::InternalServerError,
      kind: DownloadErrorKind::InternalError,
      message: String::from("Failed to seek in file"),
    });
  }
  if let Err(_) = file.take(CHUNK_SIZE).read_to_end(&mut data).await {
    return Err(DownloadError {
      status: Status::InternalServerError,
      kind: DownloadErrorKind::InternalError,
      message: String::from("Failed to read file"),
    });
  }

  let response = DownloadResponse {
    found: true,
    finished: true,
    filename: db_file.name.clone(),
    data: data,
    file_type: db_file.file_type.unwrap_or(FileType::Unknown),
  };

  Ok(response)
}
