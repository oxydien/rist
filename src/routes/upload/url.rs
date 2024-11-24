use std::path::Path;

use rocket::{futures::StreamExt, http::Status, serde::json::Json};
use sha2::{Digest, Sha256};
use tokio::io::AsyncWriteExt;

use crate::{
  db::file::FileState,
  file_type::{FileType, FileTypeDetector},
  state::State,
};

use super::{
  error::{UploadError, UploadErrorKind},
  UploadMethod, UploadResponse,
};

pub async fn upload_from_url(
  url: String,
  expires_at: u64,
  name: Option<String>,
) -> Result<Json<UploadResponse>, UploadError> {
  // Get the state
  let state = match State::get().await {
    Ok(state) => state,
    Err(_) => return Err(UploadError::state_error()),
  };

  let uuid = uuid::Uuid::new_v4().to_string();

  let mut db_file = match state
    .file_db
    .add_and_get_from_request(
      &uuid,
      name.unwrap_or(url.clone()),
      0,
      expires_at,
      UploadMethod::Url,
      true,
    )
    .await
    .map_err(|_| UploadError {
      uuid: Some(uuid.clone()),
      kind: UploadErrorKind::ServerIssue,
      status: Status::InternalServerError,
      message: Some("Failed to get file from DB".to_string()),
    })
    .unwrap()
  {
    Some(file) => file,
    None => {
      return Err(UploadError {
        uuid: Some(uuid.clone()),
        kind: UploadErrorKind::InvalidUuid,
        status: Status::BadRequest,
        message: None,
      })
    }
  };

  // Create the file
  let upload_location = Path::new(&state.config.upload.upload_location);

  if !upload_location.exists() {
    tokio::fs::create_dir_all(upload_location)
      .await
      .map_err(|e| UploadError {
        uuid: None,
        kind: UploadErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: Some(format!("Failed to create upload directory: {}", e)),
      })?;
  }

  let file_path = upload_location.join(&uuid);

  // Create reqwest client
  let client = reqwest::Client::new();

  // Start the download
  let response = client.get(&url).send().await.map_err(|e| UploadError {
    uuid: Some(uuid.clone()),
    kind: UploadErrorKind::UploadCanceled,
    status: Status::BadRequest,
    message: Some(format!("Failed to download file: {}", e)),
  })?;

  // Check if the response is successful
  if !response.status().is_success() {
    return Err(UploadError {
      uuid: Some(uuid),
      kind: UploadErrorKind::UploadCanceled,
      status: Status::BadRequest,
      message: Some(format!(
        "Failed to download file: HTTP {}",
        response.status()
      )),
    });
  }

  drop(state);

  // Create the file
  let mut file = tokio::fs::File::create(&file_path)
    .await
    .map_err(|e| UploadError {
      uuid: Some(uuid.clone()),
      kind: UploadErrorKind::FileMissing,
      status: Status::InternalServerError,
      message: Some(e.to_string()),
    })?;

  // Create the hasher
  let mut hasher = Sha256::new();
  let mut file_size: u64 = 0;
  let mut first_chunk_buffer = vec![];

  // Download and process the file in chunks
  let mut stream = response.bytes_stream();

  while let Some(chunk) = stream.next().await {
    let chunk = chunk.map_err(|e| UploadError {
      uuid: Some(uuid.clone()),
      kind: UploadErrorKind::UploadCanceled,
      status: Status::BadRequest,
      message: Some(format!("Failed to download chunk: {}", e)),
    })?;

    // Store first chunk for file type detection
    if first_chunk_buffer.len() < 16 {
      first_chunk_buffer.extend_from_slice(&chunk);
    }

    // Write chunk to file
    file.write_all(&chunk).await.map_err(|e| UploadError {
      uuid: Some(uuid.clone()),
      kind: UploadErrorKind::UploadCanceled,
      status: Status::BadRequest,
      message: Some(format!("Failed to write chunk: {}", e)),
    })?;

    // Update hash and size
    hasher.update(&chunk);
    file_size += chunk.len() as u64;
  }

  // Finalize hash
  let hash_str = hex::encode(hasher.finalize());

  // Detect file type
  let file_type = FileTypeDetector::guess(&*first_chunk_buffer);

  let state = match State::get().await {
    Ok(state) => state,
    Err(_) => return Err(UploadError::state_error()),
  };

  db_file.state = FileState::Completed;
  db_file.file_type = Some(file_type.unwrap_or(FileType::Unknown));
  db_file.hash = hash_str.clone();
  db_file.size = file_size as i64;
  db_file.path = file_path.to_string_lossy().to_string();

  state
    .file_db
    .update_data(&uuid, db_file)
    .await
    .map_err(|e| UploadError {
      uuid: Some(uuid.clone()),
      kind: UploadErrorKind::ServerIssue,
      status: Status::InternalServerError,
      message: Some(format!("Failed to update file data in db: {}", e)),
    })?;

  Ok(Json(UploadResponse {
    uuid,
    hash: hash_str,
    size: file_size as i64,
  }))
}
