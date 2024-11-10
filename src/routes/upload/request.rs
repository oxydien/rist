use std::sync::Arc;

use rocket::{http::Status, serde::json::Json};
use uuid::Uuid;

use crate::{db::file::FileState, state::State};

use super::{
  error::{UploadError, UploadErrorKind},
  UploadMethod, UploadRequest, UploadRequestResponse, UploadStatus,
};

pub const CHUNK_SIZE: u64 = 5 * 1024 * 1024; // 5 MB

pub async fn upload_request(
  data: Json<UploadRequest>,
) -> Result<Json<UploadRequestResponse>, UploadError> {
  let state = match State::get().await {
    Ok(state) => state,
    Err(_) => return Err(UploadError::state_error()),
  };

  // Check if the file size is allowed
  state.config.upload.check_size(data.0.file_size as i64)?;

  // Check if the file already exists
  if let Some(response) = check_for_existing_file(&data.0.file_hash, &state).await? {
    return Ok(response);
  }

  // Check parts for chunked upload
  let parts = if data.0.upload_method == UploadMethod::Chunked {
    Some(get_parts_amount(data.0.file_size))
  } else {
    None
  };

  // Add the upload file to the database
  let upload_id = Uuid::new_v4().to_string();
  state
    .file_db
    .add_from_request(
      &upload_id,
      data.0.file_name,
      data.0.file_size,
      data.0.expires_at,
      data.0.upload_method.clone(),
    )
    .await
    .map_err(|e| {
      eprintln!("[ERROR] Database 'FileDB' failed to add file: {}", e);
      UploadError {
        uuid: None,
        kind: UploadErrorKind::InvalidDataSupplied,
        status: Status::InternalServerError,
        message: Some("Failed to add file to DB".to_string()),
      }
    })?;

  // Add the upload status
  state
    .change_upload_status(
      &upload_id.clone(),
      UploadStatus {
        upload_method: data.0.upload_method.clone(),
        state: FileState::AwaitingData,
        total_bytes: data.0.file_size,
        uploaded_bytes: 0,
        parts: if data.0.upload_method == UploadMethod::Chunked {
          Some((0, parts.unwrap_or(0)))
        } else {
          None
        },
      },
      Some(FileState::AwaitingData),
    )
    .await;

  Ok(Json(UploadRequestResponse {
    approved: true,
    upload_id,
    upload_method: data.0.upload_method,
    upload_parts: parts,
  }))
}

async fn check_for_existing_file(
  hash: &str,
  state: &Arc<State>,
) -> Result<Option<Json<UploadRequestResponse>>, UploadError> {
  // if hash is empty
  if hash.is_empty() {
    return Ok(None);
  }

  // Check if the file already exists in db
  if let Some(existing_file) = state.file_db.get_by_hash(hash).await.map_err(|e| {
    eprintln!(
      "[ERROR] Database 'FileDB' failed to check if file exists: {}",
      e
    );
    UploadError {
      uuid: None,
      kind: UploadErrorKind::ServerIssue,
      status: Status::InternalServerError,
      message: Some("Failed to check if file exists".to_string()),
    }
  })? {
    return Ok(Some(Json(UploadRequestResponse {
      approved: false,
      upload_id: existing_file.uuid,
      upload_method: UploadMethod::Unknown,
      upload_parts: None,
    })));
  }

  Ok(None)
}

fn get_parts_amount(file_size: u64) -> u32 {
  let chunks = file_size / CHUNK_SIZE;
  if file_size % CHUNK_SIZE != 0 {
    (chunks + 1).try_into().unwrap()
  } else {
    chunks.try_into().unwrap()
  }
}
