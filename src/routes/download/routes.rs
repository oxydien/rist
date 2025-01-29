use rocket::serde::json::Json;
use rocket_governor::RocketGovernor;
use serde_json::{json, Value};

use crate::routes::{RelaxedRateLimitGuard, StandardRateLimitGuard};

use super::{DownloadError, DownloadResponse};

#[get("/api/download/info/<uuid>")]
pub async fn get_download_info<'r>(
  _rt: RocketGovernor<'r, StandardRateLimitGuard>,
  uuid: &str,
) -> Result<Json<Value>, DownloadError> {
  super::info::get_file_download_info(uuid)
    .await
    .map(|f| Json(json!({
      "uuid": f.uuid,
      "recommended_method": f.recommended_method,
      "filename": f.filename,
      "file_type": f.file_type.to_mime_type(), // To replace this with the actual mime type
      "size": f.size,
      "parts": f.parts,
      "ready": f.ready
    })))
}

#[get("/api/download/raw/<uuid>")]
pub async fn download_entire_file<'r>(
  _rt: RocketGovernor<'r, StandardRateLimitGuard>,
  uuid: &str,
) -> Result<DownloadResponse, DownloadError> {
  super::file::download_file(uuid).await
}

#[get("/api/download/part/<uuid>/<part>")]
pub async fn download_file_part<'r>(
  _rt: RocketGovernor<'r, RelaxedRateLimitGuard>,
  uuid: &str,
  part: u32,
) -> Result<DownloadResponse, DownloadError> {
  super::part::download_part(uuid, part).await
}
