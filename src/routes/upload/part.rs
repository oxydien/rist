// Part (chunk) based upload
// Saves parts as/to:
// {upload_location}/{uuid}/{part_number}.part

use std::path::Path;

use rocket::{data::ByteUnit, http::Status, serde::json::Json, Data};
use sha2::{Digest, Sha256};
use tokio::{
  fs,
  io::{AsyncReadExt, AsyncWriteExt},
};

use crate::{db::file::FileState, file_type::FileTypeDetector, state::State};

use super::{
  error::{UploadError, UploadErrorKind},
  UploadMethod, UploadResponse,
};

pub const CHUNK_SIZE: u64 = 5 * 1024 * 1024;

pub async fn upload_part(
  uuid_raw: String,
  part_number: u32,
  data: Data<'_>,
) -> Result<Json<UploadResponse>, UploadError> {
  // Get the state
  let state = State::get().await.map_err(|_| UploadError::state_error())?;
  println!("[DEV  ] Starting part upload: {}-{}", uuid_raw, part_number);

  // Validate upload status
  let upload_status = state.upload_status.clone();
  let mut status_guard = upload_status.write().await;
  let status = status_guard
    .get_mut(&uuid_raw)
    .ok_or_else(|| UploadError::invalid_uuid())?;

  // Validate upload method
  if status.upload_method != UploadMethod::Chunked {
    return Err(UploadError {
      uuid: Some(uuid_raw.clone()),
      kind: UploadErrorKind::IncorrectEndpoint,
      status: Status::BadRequest,
      message: Some("Wrong endpoint for the requested upload method".to_string()),
    });
  }

  // Validate file state
  if status.state != FileState::AwaitingData && status.state != FileState::Uploading {
    return Err(UploadError {
      uuid: Some(uuid_raw.clone()),
      kind: UploadErrorKind::AlreadyInProgress,
      status: Status::BadRequest,
      message: None,
    });
  }
  status.state = FileState::Uploading;
  let status = status.clone(); // From now on its for reading
  drop(status_guard); // Release the lock

  // Validate part number
  let (_current_parts, total_parts) = status.parts.unwrap_or((0, 0));
  if total_parts < part_number {
    return Err(UploadError {
      uuid: Some(uuid_raw.clone()),
      kind: UploadErrorKind::InvalidDataSupplied,
      status: Status::BadRequest,
      message: Some("Requested part number is too large".to_string()),
    });
  }
  println!(
    "[DEV  ] Initializing paths for part upload: {}-{}",
    uuid_raw, part_number
  );

  // Setup paths
  let upload_location = Path::new(&state.config.upload.upload_location);
  let temp_path = upload_location.join("temp");
  let uuid_path = temp_path.join(&uuid_raw);
  let part_path = uuid_path.join(format!("{part_number}.part"));

  // Create directory if it doesn't exist
  tokio::fs::create_dir_all(&uuid_path)
    .await
    .map_err(|e| UploadError {
      uuid: Some(uuid_raw.clone()),
      kind: UploadErrorKind::ServerIssue,
      status: Status::InternalServerError,
      message: Some(format!("Failed to create directory: {e}")),
    })?;

  // Check for concurrent uploads
  if part_path.exists() {
    return Err(UploadError {
      uuid: Some(uuid_raw.clone()),
      kind: UploadErrorKind::AlreadyInProgress,
      status: Status::BadRequest,
      message: Some("This part is already being uploaded".to_string()),
    });
  }

  // Write part file
  let mut file = fs::OpenOptions::new()
    .write(true)
    .create(true)
    .open(&part_path)
    .await
    .map_err(|e| UploadError {
      uuid: Some(uuid_raw.clone()),
      kind: UploadErrorKind::ServerIssue,
      status: Status::InternalServerError,
      message: Some(format!("Failed to create part file: {e}")),
    })?;

  let mut file_size = 0;
  let mut stream = data.open(ByteUnit::from(CHUNK_SIZE));
  let mut buffer = [0u8; 8192]; // 8 KiB buffer

  println!("[DEV  ] Reading part: {}-{}", uuid_raw, part_number);

  loop {
    match stream.read(&mut buffer).await {
      Ok(0) => break, // End Of File
      Ok(n) => {
        let chunk = &buffer[..n];
        file.write_all(chunk).await.map_err(|e| UploadError {
          uuid: Some(uuid_raw.clone()),
          kind: UploadErrorKind::ServerIssue,
          status: Status::InternalServerError,
          message: Some(format!("Failed to write part: {e}")),
        })?;
        file_size += n as u64;

        // Validate chunk size
        if file_size > CHUNK_SIZE {
          // Clean up the partial upload
          let _ = fs::remove_file(&part_path).await;
          return Err(UploadError {
            uuid: Some(uuid_raw.clone()),
            kind: UploadErrorKind::InvalidDataSupplied,
            status: Status::BadRequest,
            message: Some("Chunk size exceeds maximum allowed size".to_string()),
          });
        }

        if let Some(status) = upload_status.write().await.get_mut(&uuid_raw) {
          status.uploaded_bytes += n as u64;

          // Check total file size
          if status.uploaded_bytes > state.config.upload.max_size_bytes as u64 {
            // Clean up the partial upload
            let _ = fs::remove_file(&part_path).await;
            status.state = FileState::UploadCancelled;
            return Err(UploadError {
              uuid: Some(uuid_raw.clone()),
              kind: UploadErrorKind::InvalidDataSupplied,
              status: Status::BadRequest,
              message: Some("Total file size exceeds maximum allowed size".to_string()),
            });
          }
        }
      }
      Err(e) => {
        eprintln!("[WARN ] Failed to read stream data: {}", e);
        let mut status_guard = upload_status.write().await;
        let status = status_guard
          .get_mut(&uuid_raw)
          .ok_or_else(|| UploadError::invalid_uuid())?;

        status.state = FileState::Error;
        let _ = fs::remove_file(&part_path).await;
        return Err(UploadError {
          uuid: Some(uuid_raw.clone()),
          kind: UploadErrorKind::UploadCanceled,
          status: Status::BadRequest,
          message: None,
        });
      }
    }
  }
  println!(
    "[DEV  ] Successfully read data for part: {}-{}",
    uuid_raw, part_number
  );

  let mut status_guard = upload_status.write().await;
  let status = status_guard
    .get_mut(&uuid_raw)
    .ok_or_else(|| UploadError::invalid_uuid())?;

  // Update upload status
  let (current_parts, total_parts) = status.parts.unwrap_or((0, 0));
  status.parts = Some((current_parts + 1, total_parts));

  println!(
    "[DEV  ] Part uploaded: {}-{}, {}/{}",
    uuid_raw, part_number, current_parts, total_parts
  );

  // Check if all parts are uploaded
  if status.parts.unwrap().0 == status.parts.unwrap().1 {
    status.state = FileState::Finishing;
    drop(status_guard);
    println!("[DEV  ] Finishing upload: {}-{}", uuid_raw, part_number);

    match finish_upload(uuid_raw.clone()).await {
      Ok((hash, size)) => {
        println!("[DEV  ] Finished upload: {}-{}", uuid_raw, part_number);
        Ok(Json(UploadResponse {
          uuid: uuid_raw,
          hash,
          size: size as i64,
        }))
      }
      Err(e) => {
        eprintln!("[ERROR] Failed to finish upload: {}", e);
        Err(e)
      }
    }
  } else {
    println!("[DEV  ] Part complete: {}-{}", uuid_raw, part_number);
    Ok(Json(UploadResponse {
      uuid: uuid_raw,
      hash: String::new(), // Empty until finished
      size: status.uploaded_bytes as i64,
    }))
  }
}

// MARK: Finish upload
/// Finishes an upload by combining all part files and calculating the final hash.
///
/// This function will:
/// - Check that all parts exist and are not empty
/// - Read each part file into memory and update the hash
/// - Write each part's content to the final file
/// - Flush and close the final file
/// - Tries to clean up the temp directory
/// - Update the file state in the database
/// - Return the final hash and total size of the file
async fn finish_upload(uuid_raw: String) -> Result<(String, u64), UploadError> {
  let state = State::get().await.map_err(|_| UploadError::state_error())?;

  // Setup paths
  let upload_location = Path::new(&state.config.upload.upload_location);
  let temp_path = upload_location.join("temp");
  let uuid_path = temp_path.join(&uuid_raw);

  // Check for uuid directory
  if !uuid_path.exists() {
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

  let file_path = upload_location.join(&uuid_raw);

  // Check for concurrent uploads (this should never happen)
  if file_path.exists() {
    eprintln!(
      "[WARN ] (Part upload finish) Final file already exists: {}",
      file_path.display()
    );
    return Err(UploadError {
      uuid: Some(uuid_raw.clone()),
      kind: UploadErrorKind::AlreadyInProgress,
      status: Status::BadRequest,
      message: None,
    });
  }

  let mut file = fs::OpenOptions::new()
    .write(true)
    .create(true)
    .open(&file_path)
    .await
    .map_err(|e| UploadError {
      uuid: Some(uuid_raw.clone()),
      kind: UploadErrorKind::ServerIssue,
      status: Status::InternalServerError,
      message: Some(format!("Failed to create final file: {e}")),
    })?;

  let mut hasher = Sha256::new();
  let mut total_size = 0u64;

  let upload_status = state.upload_status.clone();
  let mut status_guard = upload_status.write().await;
  let status = status_guard.get_mut(&uuid_raw).ok_or_else(|| UploadError {
    uuid: Some(uuid_raw.clone()),
    kind: UploadErrorKind::InvalidUuid,
    status: Status::BadRequest,
    message: None,
  })?;
  let total_parts = status.parts.unwrap().1;
  drop(status_guard); // Release the lock

  // Save the first part for file type detection
  let mut first_part_buffer = vec![];

  println!("[DEV  ] Combining parts for: {}", uuid_raw);
  // Combine parts and calculate hash
  for i in 0..total_parts {
    let part_path = uuid_path.join(format!("{i}.part"));

    // Read the entire part file into memory
    let part_content = fs::read(&part_path).await.map_err(|e| UploadError {
      uuid: Some(uuid_raw.clone()),
      kind: UploadErrorKind::ServerIssue,
      status: Status::InternalServerError,
      message: Some(format!("Failed to read part file: {e}")),
    })?;

    if i == 0 {
      first_part_buffer = part_content.clone();
    }

    // Update hash and write to final file
    hasher.update(&part_content);
    file
      .write_all(&part_content)
      .await
      .map_err(|e| UploadError {
        uuid: Some(uuid_raw.clone()),
        kind: UploadErrorKind::ServerIssue,
        status: Status::InternalServerError,
        message: Some(format!("Failed to write to final file: {e}")),
      })?;

    total_size += part_content.len() as u64;

    // Explicitly remove the part file
    if let Err(e) = fs::remove_file(&part_path).await {
      eprintln!("[ERROR] Failed to remove part file {}: {}", i, e);
    }
  }

  // Explicitly flush and close the final file
  if let Err(e) = file.flush().await {
    eprintln!("[ERROR] Failed to flush final file: {}", e);
  }
  drop(file);

  println!("[DEV  ] Cleaning up temp directory: {}", uuid_raw);

  // Clean up temp directory
  let mut cleaned = false;
  for _ in 0..3 {
    // Retry cleanup a few times
    if fs::remove_dir_all(&uuid_path).await.is_ok() {
      cleaned = true;
      break;
    }
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
  }

  if !cleaned {
    eprintln!("[WARN ] Failed to clean up temp directory: {}", uuid_raw);
  }

  // Update file state
  if let Some(status) = upload_status.write().await.get_mut(&uuid_raw) {
    status.state = FileState::Completed;
  }

  println!("[DEV  ] Calculating final hash: {}", uuid_raw);
  let complete_hash = hasher.finalize();
  let hash_str: String = hex::encode(complete_hash);

  println!("[DEV  ] Detecting file type for: {}", uuid_raw);
  let file_type = FileTypeDetector::guess(first_part_buffer.as_slice());

  db_file.state = FileState::Completed;
  db_file.hash = hash_str.clone();
  db_file.size = total_size as i64;
  db_file.path = file_path.to_string_lossy().to_string();
  db_file.file_type = file_type.map(|f| Some(f)).unwrap_or(None);

  println!(
    "[DEV  ] Final state: hash={}, size={}, type={:?}; for: {}",
    hash_str, total_size, &db_file.file_type, uuid_raw
  );
  // Update database
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

  Ok((hash_str, total_size))
}
