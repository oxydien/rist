use std::path::Path;

use rocket::{data::ByteUnit, http::Status, serde::json::Json, Data};
use sha2::{Digest, Sha256};
use tokio::{
  fs,
  io::{AsyncReadExt, AsyncWriteExt},
};

use crate::{db::file::FileState, state::State};

use super::{
  error::{UploadError, UploadErrorKind},
  UploadMethod, UploadResponse,
};

pub async fn upload_entire_content(
  uuid_raw: String,
  data: Data<'_>,
) -> Result<Json<UploadResponse>, UploadError> {
  // Get the state
  let state = match State::get().await {
    Ok(state) => state,
    Err(_) => return Err(UploadError::state_error()),
  };

  // Check if the file is already being uploaded or was already uploaded
  let upload_status = state.upload_status.clone();
  if let Some(status) = upload_status.write().await.get_mut(&uuid_raw) {
    if status.upload_method != UploadMethod::EntireContent {
      return Err(UploadError {
        uuid: Some(uuid_raw.clone()),
        kind: UploadErrorKind::IncorrectEndpoint,
        status: Status::BadRequest,
        message: Some(
          "Wrong endpoint. Please use the correct endpoint based on your requested upload method."
            .to_string(),
        ),
      });
    }

    if status.state != FileState::AwaitingData {
      return Err(UploadError {
        uuid: Some(uuid_raw.clone()),
        kind: UploadErrorKind::AlreadyInProgress,
        status: Status::BadRequest,
        message: None,
      });
    }

    status.state = FileState::Uploading;
    status.uploaded_bytes = 0;
  } else {
    return Err(UploadError {
      uuid: Some(uuid_raw.clone()),
      kind: UploadErrorKind::InvalidUuid,
      status: Status::BadRequest,
      message: None,
    });
  }

  // Get the temporary file from the database
  let mut db_file = match state
    .file_db
    .get_by_uuid(&uuid_raw)
    .await
    .map_err(|_| UploadError {
      uuid: Some(uuid_raw.clone()),
      kind: UploadErrorKind::ServerIssue,
      status: Status::InternalServerError,
      message: Some("Failed to get file from DB".to_string()),
    })
    .unwrap()
  {
    Some(file) => file,
    None => {
      return Err(UploadError {
        uuid: Some(uuid_raw.clone()),
        kind: UploadErrorKind::InvalidUuid,
        status: Status::BadRequest,
        message: None,
      })
    }
  };

  // Create the file
  let save_path = Path::new(&db_file.path);
  let save_parent = save_path.parent().unwrap();
  if !save_parent.exists() {
    std::fs::create_dir_all(save_parent).unwrap();
  }

  let mut file = fs::File::create(&db_file.path)
    .await
    .map_err(|e| UploadError {
      uuid: Some(uuid_raw.clone()),
      kind: UploadErrorKind::FileMissing,
      status: Status::InternalServerError,
      message: Some(e.to_string()),
    })?;

  // Create the hasher
  let mut hasher = Sha256::new();
  let mut file_size: u64 = 0;

  // Loop through the file data and write it to the file
  let mut stream = data.open(ByteUnit::from(state.config.upload.max_size_bytes.clone()));
  let mut buffer = [0u8; 8192]; // 8 KiB buffer

  drop(state);
  loop {
    match stream.read(&mut buffer).await {
      Ok(0) => break, // End Of File
      Ok(n) => {
        let chunk = &buffer[..n];

        if file.write_all(chunk).await.is_err() {
          break;
        }

        hasher.update(chunk);

        file_size += n as u64;

        // Update upload status
        if let Some(status) = upload_status.write().await.get_mut(&uuid_raw) {
          status.uploaded_bytes += n as u64;
        }
      }
      Err(e) => {
        eprintln!("[ERROR] Failed to read stream data: {}", e);
        return Err(UploadError {
          uuid: Some(uuid_raw.clone()),
          kind: UploadErrorKind::UploadCanceled,
          status: Status::BadRequest,
          message: None,
        });
      }
    }
  }

  // Update upload status
  if let Some(status) = upload_status.write().await.get_mut(&uuid_raw) {
    status.state = FileState::Finishing;
  }

  // Finalize the hash
  let hash_str = hex::encode(hasher.clone().finalize());

  let state = match State::get().await {
    Ok(state) => state,
    Err(_) => return Err(UploadError::state_error()),
  };

  // Update the database
  db_file.state = FileState::Completed;
  db_file.hash = hash_str.clone();
  db_file.size = file_size as i64;

  state
    .file_db
    .update_data(&uuid_raw, db_file)
    .await
    .map_err(|e| {
      eprintln!("[ERROR] Database 'FileDB' failed to update file: {}", e);
      UploadError {
        uuid: Some(uuid_raw.clone()),
        kind: UploadErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: Some("Failed to update file in DB".to_string()),
      }
    })
    .unwrap();

  // Remove from upload status
  if state
    .upload_status
    .write()
    .await
    .remove(&uuid_raw)
    .is_none()
  {
    eprintln!(
      "[WARN  ] Failed to remove upload status for UUID: {}",
      uuid_raw
    );
  }

  Ok(Json(UploadResponse {
    uuid: uuid_raw,
    hash: hash_str,
    size: file_size as i64,
  }))
}
