use std::fmt::Display;

use rocket::http::Status;
use serde::Serialize;

use crate::{db::user::PermissionKind, routes::TokenAuth};

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
  IncorrectEndpoint,
}

#[derive(Serialize, Debug)]
pub struct UploadError {
  pub uuid: Option<String>,
  pub kind: UploadErrorKind,
  pub status: Status,
  pub message: Option<String>,
}

impl UploadError {
  pub fn new(kind: UploadErrorKind, status: Status, message: Option<String>) -> Self {
    Self {
      uuid: None,
      kind,
      status,
      message,
    }
  }

  pub fn check_permissions(auth: TokenAuth, required: PermissionKind) -> Result<(), Self> {
    if !auth.0.has_permissions_to(required) {
      Err(UploadError {
        uuid: None,
        kind: UploadErrorKind::NoPermissions,
        status: Status::Forbidden,
        message: None,
      })
    } else {
      Ok(())
    }
  }

  /// Generic error for state issues
  /// [None], [UploadErrorKind::ServerIssue], [Status::InternalServerError]
  pub fn state_error() -> Self {
    Self {
      uuid: None,
      kind: UploadErrorKind::ServerIssue,
      status: Status::InternalServerError,
      message: Some("Server state manager issue. Please try again later.".to_string()),
    }
  }

  pub fn invalid_uuid() -> Self {
    Self {
      uuid: None,
      kind: UploadErrorKind::InvalidUuid,
      status: Status::BadRequest,
      message: None,
    }
  }

  pub fn with_uuid(self, uuid: String) -> Self {
    Self {
      uuid: Some(uuid),
      ..self
    }
  }
}

impl Display for UploadError {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    let empty_string = "".to_string();
    write!(
      f,
      "({:?}) - {}: {}",
      self.kind,
      self.status,
      self.message.as_ref().unwrap_or_else(|| &empty_string)
    )
  }
}
