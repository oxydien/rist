use rocket::{http::Status, serde::json::Json};
use rocket_governor::RocketGovernor;
use serde::Serialize;

use crate::module::{GetModule, Module};

use super::{
  medal::MedalModule, upload::UploadModule, youtube::YoutubeModule, RateLimitGuard, TokenAuth,
};

#[derive(Serialize)]
pub struct ServerInfo {
  pub software: String,
  pub version: String,
  pub repository: String,
  pub issues: String,
  pub license: String,
  pub modules: Vec<Module>,
}

#[rocket::get("/api/info")]
pub async fn get_info_route<'r>(
  _rt: RocketGovernor<'r, RateLimitGuard>,
  auth: TokenAuth,
) -> Result<Json<ServerInfo>, Status> {
  get_info(auth).await
}

pub async fn get_info(auth: TokenAuth) -> Result<Json<ServerInfo>, Status> {
  let user = auth.0;

  let mut modules = Vec::new();
  let yt_module = UploadModule::get_module().await;
  if user.has_permissions_to(yt_module.permissions) {
    modules.push(yt_module);
  }

  let medal_module = MedalModule::get_module().await;
  if user.has_permissions_to(medal_module.permissions) {
    modules.push(medal_module);
  }

  let yt_module = YoutubeModule::get_module().await;
  if user.has_permissions_to(yt_module.permissions) {
    modules.push(yt_module);
  }

  let info = ServerInfo {
    software: option_env!("CARGO_PKG_NAME").unwrap_or("RIST").to_string(),
    version: option_env!("CARGO_PKG_VERSION")
      .unwrap_or("unknown")
      .to_string(),
    repository: option_env!("CARGO_PKG_REPOSITORY")
      .unwrap_or("https://github.com/oxydien/rist")
      .to_string(),
    issues: "https://github.com/oxydien/rist/issues".to_string(),
    license: option_env!("CARGO_PKG_LICENSE")
      .unwrap_or("MIT")
      .to_string(),
    modules,
  };
  Ok(Json(info))
}
