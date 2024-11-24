use rocket::{http::Status, serde::json::Json, Data};
use rocket_governor::RocketGovernor;

use crate::{
  db::user::PermissionKind,
  routes::{RelaxedRateLimitGuard, StandardRateLimitGuard, TokenAuth},
};

use super::{
  error::UploadError, UploadRequest, UploadRequestResponse, UploadResponse, UploadStatus,
};

#[get("/api/upload_status/<uuid>")]
pub async fn get_upload_status<'r>(
  _brt: RocketGovernor<'r, RelaxedRateLimitGuard>,
  uuid: &str,
) -> Result<Json<UploadStatus>, Status> {
  super::status::get_upload_status(uuid).await
}

#[post("/api/upload/request", format = "json", data = "<data>")]
pub async fn request_upload<'r>(
  _rt: RocketGovernor<'r, StandardRateLimitGuard>,
  auth: TokenAuth,
  data: Json<UploadRequest>,
) -> Result<Json<UploadRequestResponse>, UploadError> {
  UploadError::check_permissions(auth, PermissionKind::FileUpload)?;

  super::request::upload_request(data).await
}

#[post("/api/upload/<uuid>", data = "<data>")]
pub async fn upload_file_whole<'r>(
  _srt: RocketGovernor<'r, StandardRateLimitGuard>,
  auth: TokenAuth,
  uuid: &str,
  data: Data<'_>,
) -> Result<Json<UploadResponse>, UploadError> {
  let uuid = uuid.to_string();
  UploadError::check_permissions(auth, PermissionKind::FileUpload)
    .map_err(|e| e.with_uuid(uuid.clone()))?;

  super::file::upload_entire_content(uuid, data).await
}

#[post("/api/upload/part/<uuid>/<part_number>", data = "<data>")]
pub async fn upload_file_part<'r>(
  _srt: RocketGovernor<'r, RelaxedRateLimitGuard>,
  auth: TokenAuth,
  uuid: &str,
  part_number: u32,
  data: Data<'_>,
) -> Result<Json<UploadResponse>, UploadError> {
  let uuid = uuid.to_string();
  UploadError::check_permissions(auth, PermissionKind::FileUpload)
    .map_err(|e| e.with_uuid(uuid.clone()))?;

  super::part::upload_part(uuid, part_number, data).await
}
