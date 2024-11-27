// # Upload module
// MARK: Dev Notes
// If you modify this part of the project,
// please update the values here:
// Time wasted: 17h
// Not working ideas: 120

use std::{collections::HashMap, sync::Arc};

use serde::{Deserialize, Serialize};
use serde_repr::{Deserialize_repr, Serialize_repr};
use tokio::sync::RwLock;

use crate::{
  db::{file::FileState, user::PermissionKind},
  module::{GetModule, Module},
  utils,
};

pub mod error;
pub(crate) mod file;
pub(crate) mod part;
pub(crate) mod request;
pub(crate) mod responders;
pub(crate) mod routes;
pub(crate) mod status;
pub(crate) mod url;

// MARK: Module
pub struct UploadModule {}

impl GetModule for UploadModule {
  async fn get_module() -> Module {
    let mut routes: HashMap<String, String> = HashMap::new();
    routes.insert(
      "UPLOAD_REQUEST".to_string(),
      "/api/upload/request".to_string(),
    );
    routes.insert(
      "UPLOAD_STATUS".to_string(),
      "/api/upload_status/<uuid>".to_string(),
    );
    routes.insert(
      "UPLOAD_ENTIRE".to_string(),
      "/api/upload/<uuid>".to_string(),
    );
    routes.insert(
      "UPLOAD_PART".to_string(),
      "/api/upload/part/<uuid>/<part_number>".to_string(),
    );

    Module {
      name: "Upload".to_string(),
      api_routes: routes,
      version: "0.1.0".to_string(),
      summary: format!(
        "Store and share your files, up to {} in size, on the server.",
        utils::format_bytes(utils::get_max_file_size(None).await)
      ),
      icon_name: "upload".to_string(),
      module_dash_url: "upload".to_string(),
      permissions: PermissionKind::MedalDownload,
    }
  }
}

// MARK: Models
#[derive(Serialize, Clone)]
pub struct UploadStatus {
  pub upload_method: UploadMethod,
  pub state: FileState,
  pub total_bytes: u64,
  pub uploaded_bytes: u64,
  pub parts: Option<UploadParts>,
}

/// As a tuple of (current, max)
type UploadParts = (u32, u32);

#[derive(Debug, Deserialize_repr, Serialize_repr, PartialEq, Clone)]
#[repr(u8)]
pub enum UploadMethod {
  #[serde(default)]
  Unknown = 0,
  /// Used when the entire can be uploaded at once
  EntireContent = 1,
  /// Used when the uploaded content has to be sent in chunks (cloudflare)
  Chunked = 2,
  Url = 3,
}

impl UploadMethod {
  pub fn from_u8(state: u8) -> Self {
    match state {
      0 => UploadMethod::Unknown,
      1 => UploadMethod::EntireContent,
      2 => UploadMethod::Chunked,
      3 => UploadMethod::Url,
      _ => UploadMethod::Unknown,
    }
  }
  pub fn as_u8(&self) -> u8 {
    match self {
      UploadMethod::Unknown => 0,
      UploadMethod::EntireContent => 1,
      UploadMethod::Chunked => 2,
      UploadMethod::Url => 3,
    }
  }
}

#[derive(Deserialize)]
pub struct UploadRequest {
  pub upload_method: UploadMethod,
  pub file_size: u64,
  pub file_name: String,
  pub file_hash: String,
  pub expires_at: u64,
}

#[derive(Serialize)]
pub struct UploadRequestResponse {
  pub approved: bool,
  pub upload_id: String,
  pub upload_method: UploadMethod,
  pub upload_parts: Option<u32>,
}

pub type UploadStatusMap = Arc<RwLock<HashMap<String, UploadStatus>>>;

#[derive(Serialize)]
pub struct UploadResponse {
  pub uuid: String,
  hash: String,
  size: i64,
}
