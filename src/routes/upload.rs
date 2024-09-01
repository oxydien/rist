// MARK: Dev Notes
// If you touch this file, update the values here:
// Time wasted: 14h
// Not working ideas: 88

use rocket::data::ByteUnit;
use rocket::http::{Header, Status};
use rocket::serde::json::Json;
use rocket::Data;
use rocket::{post, response, Request, Response};
use rocket_governor::RocketGovernor;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use std::io::Cursor;
use std::{collections::HashMap, path::Path, sync::Arc};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio::{io::AsyncReadExt, sync::RwLock};
use uuid::Uuid;

use crate::db::file::FileState;
use crate::db::user::PermissionKind;
use crate::state::State;

use super::{BaseRateLimitGuard, RateLimitGuard, TokenAuth};

// MARK: Models
#[derive(Serialize, Clone)]
pub struct UploadStatus {
    pub state: FileState,
    pub total_bytes: u64,
    pub uploaded_bytes: u64,
}

#[derive(Deserialize)]
pub struct UploadRequest {
    pub file_size: u64,
    pub file_name: String,
    pub file_hash: String,
    pub expires_at: u64,
}

#[derive(Serialize)]
pub struct UploadRequestResponse {
    pub approved: bool,
    pub upload_id: String,
}

pub type UploadStatusMap = Arc<RwLock<HashMap<String, UploadStatus>>>;

#[derive(Serialize)]
pub struct UploadResponse {
    uuid: String,
    hash: String,
    size: i64,
}

#[derive(Serialize, Debug)]
pub enum UploadErrorKind {
    Unknown,
    InvalidUuid,
    InvalidDataSupplied,
    UploadCanceled,
    AlreadyInProgress,
    FileTooLarge,
    FileMissing,
    ServerIssue,
    NoPermissions,
}

// MARK: Responders
#[derive(Serialize, Debug)]
pub struct UploadError {
    pub uuid: Option<String>,
    pub kind: UploadErrorKind,
    pub status: Status,
    pub message: Option<String>,
}

#[rocket::async_trait]
impl<'r, 'o: 'r> response::Responder<'r, 'o> for UploadError {
    fn respond_to(self, _: &Request) -> rocket::response::Result<'o> {
        let m_uuid = self.uuid.clone();
        if let Some(uuid) = self.uuid {
            // Remove the uploaded file
            tokio::spawn(async move {
                if let Ok(state) = State::get().await.map_err(|e| e.to_string()) {
                    state.remove_upload_status(&uuid).await;

                    let _ = state.file_db.remove_by_uuid(&uuid).await;
                }
            });
        }

        let mut res = Response::new();
        res.set_status(self.status);
        let body = json!({
            "status": self.status.code,
            "uuid": m_uuid,
            "kind": self.kind,
            "message": self.message
        });
        let body = serde_json::to_string(&body).unwrap();
        println!("[DEBUG ] (Upload Error) {}", &body);
        res.set_sized_body(body.len(), Cursor::new(body));
        res.set_header(Header::new("Content-Type", "application/json"));
        Ok(res)
    }
}

// MARK: Upload Request
#[post("/api/upload/request", format = "json", data = "<data>")]
pub async fn request_upload<'r>(
    _rt: RocketGovernor<'r, RateLimitGuard>,
    auth: TokenAuth,
    data: Json<UploadRequest>,
) -> Result<Json<UploadRequestResponse>, UploadError> {
    if !auth.0.has_permissions_to(PermissionKind::FileUpload) {
        return Err(UploadError {
            uuid: None,
            kind: UploadErrorKind::NoPermissions,
            status: Status::Forbidden,
            message: None,
        });
    }

    let state = match State::get().await {
        Ok(state) => state,
        Err(_) => {
            return Err(UploadError {
                uuid: None,
                kind: UploadErrorKind::ServerIssue,
                status: Status::InternalServerError,
                message: None,
            })
        }
    };

    if data.0.file_size > state.config.upload.max_size_bytes as u64 {
        return Err(UploadError {
            uuid: None,
            kind: UploadErrorKind::FileTooLarge,
            status: Status::PayloadTooLarge,
            message: Some(format!(
                "File is too large. Max size is {}",
                state.config.upload.max_size_bytes
            ))
        });
    }

    // Check if the file already exists
    if let Some(existing_file) = state
        .file_db
        .get_by_hash(&data.0.file_hash)
        .await
        .map_err(|e| {
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
        })
        .unwrap()
    {
        return Ok(Json(UploadRequestResponse {
            approved: false,
            upload_id: existing_file.uuid,
        }));
    }

    let upload_id = Uuid::new_v4().to_string();

    state
        .file_db
        .add_from_request(
            &upload_id,
            data.0.file_name,
            data.0.file_size,
            data.0.expires_at,
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
        })
        .unwrap();

    let mut status_map = state.upload_status.write().await;
    status_map.insert(
        upload_id.clone(),
        UploadStatus {
            state: FileState::AwaitingData,
            total_bytes: data.0.file_size,
            uploaded_bytes: 0,
        },
    );

    Ok(Json(UploadRequestResponse {
        approved: true,
        upload_id,
    }))
}

// MARK: Upload File
#[post("/api/upload/<uuid_raw>", data = "<data>")]
pub async fn upload_file<'r>(
    _srt: RocketGovernor<'r, RateLimitGuard>,
    auth: TokenAuth,
    uuid_raw: &str,
    data: Data<'_>,
) -> Result<Json<UploadResponse>, UploadError> {
    let uuid = uuid_raw.to_string();

    // Check user permissions
    if !auth.0.has_permissions_to(PermissionKind::FileUpload) {
        return Err(UploadError {
            uuid: Some(uuid.clone()),
            kind: UploadErrorKind::NoPermissions,
            status: Status::Forbidden,
            message: None,
        });
    }

    // Get the state
    let state = match State::get().await {
        Ok(state) => state,
        Err(_) => {
            return Err(UploadError {
                uuid: Some(uuid.clone()),
                kind: UploadErrorKind::ServerIssue,
                status: Status::InternalServerError,
                message: None,
            })
        }
    };

    // Check if the file is already being uploaded or was already uploaded
    let state_clone = state.upload_status.clone();
    if let Some(status) = state_clone.write().await.get_mut(&uuid) {
        if status.state != FileState::AwaitingData {
            return Err(UploadError {
                uuid: Some(uuid.clone()),
                kind: UploadErrorKind::AlreadyInProgress,
                status: Status::BadRequest,
                message: None,
            });
        }

        status.state = FileState::Uploading;
        status.uploaded_bytes = 0;
    } else {
        return Err(UploadError {
            uuid: Some(uuid.clone()),
            kind: UploadErrorKind::InvalidUuid,
            status: Status::BadRequest,
            message: None,
        });
    }

    // Get the temporary file from the database
    let mut db_file = match state
        .file_db
        .get_by_uuid(&uuid)
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
    let save_path = Path::new(&db_file.path);
    let save_parent = save_path.parent().unwrap();
    if !save_parent.exists() {
        std::fs::create_dir_all(save_parent).unwrap();
    }

    let mut file = fs::File::create(&db_file.path)
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
                if let Some(status) = state_clone.write().await.get_mut(&uuid) {
                    status.uploaded_bytes += n as u64;
                }
            }
            Err(e) => {
                eprintln!("[ERROR] Failed to read stream data: {}", e);
                return Err(UploadError {
                    uuid: Some(uuid.clone()),
                    kind: UploadErrorKind::UploadCanceled,
                    status: Status::BadRequest,
                    message: None,
                });
            }
        }
    }

    // Update upload status
    if let Some(status) = state_clone.write().await.get_mut(&uuid) {
        status.state = FileState::Finishing;
    }

    // Finalize the hash
    let hash_str = hex::encode(hasher.clone().finalize());

    let state = match State::get().await {
        Ok(state) => state,
        Err(_) => {
            return Err(UploadError {
                uuid: Some(uuid.clone()),
                kind: UploadErrorKind::ServerIssue,
                status: Status::InternalServerError,
                message: None,
            })
        }
    };

    // Update the database
    db_file.hash = hash_str.clone();
    db_file.size = file_size as i64;

    state
        .file_db
        .update_data(&uuid, db_file)
        .await
        .map_err(|e| {
            eprintln!("[ERROR] Database 'FileDB' failed to update file: {}", e);
            UploadError {
                uuid: Some(uuid.clone()),
                kind: UploadErrorKind::ServerIssue,
                status: Status::InternalServerError,
                message: Some("Failed to update file in DB".to_string()),
            }
        })
        .unwrap();

    // Remove from upload status
    if state.upload_status.write().await.remove(&uuid).is_none() {
        eprintln!("[WARN  ] Failed to remove upload status for UUID: {}", uuid);
    }

    Ok(Json(UploadResponse {
        uuid,
        hash: hash_str,
        size: file_size as i64,
    }))
}

// MARK: Get Upload Status
#[get("/api/upload_status/<upload_id>")]
pub async fn get_upload_status<'r>(
    _brt: RocketGovernor<'r, BaseRateLimitGuard>,
    upload_id: &str,
) -> Result<Json<UploadStatus>, Status> {
    let state = match State::get().await {
        Ok(state) => state,
        Err(_) => return Err(Status::InternalServerError),
    };

    let status_map = state.upload_status.read().await;
    if let Some(status) = status_map.get(upload_id) {
        Ok(Json(status.clone()))
    } else {
        Err(Status::NotFound)
    }
}
