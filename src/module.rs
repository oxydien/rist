use std::collections::HashMap;

use serde::Serialize;

use crate::db::user::PermissionKind;

/// A struct that represents a rist module (plugin).
/// WIP
#[derive(Clone, Serialize)]
pub struct Module {
  /// Name of the module
  pub name: String,

  /// API routes that can be accessed from the frontend (e.g. 'SOME_ROUTE' => '/api/some_route')
  pub api_routes: HashMap<String, String>,

  /// Version of the module (e.g. '0.0.1' or 'Alpha 1.0.0')
  pub version: String,

  /// Summary of the module
  pub summary: String,

  /// Icon that will be displayed in the dashboard (icon list in frontend)
  pub icon_name: String,

  /// Sub-url to access this module `/dash/[module_dash_url]`
  pub module_dash_url: String,

  /// Required permissions to use this module
  pub permissions: PermissionKind, // WIP
}

pub trait GetModule {
  fn get_module() -> impl std::future::Future<Output = Module> + Send;
}
