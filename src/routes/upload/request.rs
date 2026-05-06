use std::sync::Arc;

use rocket::{http::Status, serde::json::Json};
use uuid::Uuid;

use crate::{db::file::FileState, state::State};
use crate::routes::upload::request::url_shortener::shortened_id;
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

  let shortened = if data.0.shorten { shortened_id() } else { None };

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
      shortened.clone(),
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
    shortened_url: shortened,
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
      shortened_url: if existing_file.shortened.is_empty() { None } else { Some(existing_file.shortened) },
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

pub(crate) mod url_shortener {
  use std::time::{SystemTime, UNIX_EPOCH};

  const ALPHABET: &[u8; 65] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_~";
  pub const ID_LEN:    usize = 7;

  pub fn shortened_id() -> Option<String> {
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    let mut bytes = [0u8; ID_LEN];

    let mut ts = ms;
    for i in (0..ID_LEN).rev() {
      bytes[i] = ALPHABET[(ts % 65) as usize];
      ts /= 65;
    }

    String::from_utf8(bytes.to_vec()).ok()
  }
}
