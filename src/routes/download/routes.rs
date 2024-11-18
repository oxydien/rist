use rocket::serde::json::Json;
use rocket_governor::RocketGovernor;

use crate::routes::RateLimitGuard;

use super::{info::DownloadFileInfo, DownloadError, DownloadResponse};

#[get("/api/download/info/<uuid>")]
pub async fn get_download_info<'r>(
  _rt: RocketGovernor<'r, RateLimitGuard>,
  uuid: &str,
) -> Result<Json<DownloadFileInfo>, DownloadError> {
  super::info::get_file_download_info(uuid)
    .await
    .map(|f| Json(f))
}

#[get("/api/download/raw/<uuid>")]
pub async fn download_entire_file<'r>(
  _rt: RocketGovernor<'r, RateLimitGuard>,
  uuid: &str,
) -> Result<DownloadResponse, DownloadError> {
  super::file::download_file(uuid).await
}

#[get("/api/download/part/<uuid>/<part>")]
pub async fn download_file_part<'r>(
  _rt: RocketGovernor<'r, RateLimitGuard>,
  uuid: &str,
  part: u32,
) -> Result<DownloadResponse, DownloadError> {
  super::part::download_part(uuid, part).await
}
