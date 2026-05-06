use std::io::Cursor;

use rocket::{
  http::Status,
  response::{self},
  serde::json::Json,
  Request, Response,
};

use serde::Serialize;

use crate::file_type::FileType;

pub mod file;
pub mod info;
pub mod part;
pub mod routes;

#[derive(Debug, Serialize)]
pub enum DownloadErrorKind {
  NotFound,
  InternalError,
  NotReady,
  InvalidPartNumber,
  Forbidden,
}

#[derive(Debug, Serialize)]
pub struct DownloadError {
  pub status: Status,
  pub kind: DownloadErrorKind,
  pub message: String,
}

pub struct DownloadResponse {
  pub found: bool,
  pub finished: bool,
  pub filename: String,
  pub data: Vec<u8>,
  pub file_type: FileType,
}

impl DownloadResponse {
  pub fn default() -> Self {
    Self {
      found: false,
      finished: false,
      filename: String::new(),
      data: Vec::new(),
      file_type: FileType::Unknown,
    }
  }
}

#[rocket::async_trait]
impl<'r, 'o: 'r> response::Responder<'r, 'o> for DownloadResponse {
  fn respond_to(self, _: &Request) -> rocket::response::Result<'o> {
    if !self.found {
      let mut res = Response::new();
      res.set_raw_header("Location", format!("/?info=Could%20not%20find%20%20{}", self.filename));
      res.set_status(Status::Found);
      return Ok(res);
    }

    if !self.finished {
      let mut res = Response::new();
      res.set_raw_header("Location", format!("/?info=File%20not%20finished%20uploading%20{}", self.filename));
      res.set_status(Status::SeeOther);
      return Ok(res);
    }

    let mut res = Response::new();

    res.set_raw_header("Content-Type", self.file_type.to_mime_type());
    res.set_raw_header(
      "Content-Disposition",
      format!("attachment; filename=\"{}\"", self.filename),
    );
    res.set_sized_body(self.data.len(), Cursor::new(self.data));

    Ok(res)
  }
}

#[rocket::async_trait]
impl<'r, 'o: 'r> response::Responder<'r, 'o> for DownloadError {
  fn respond_to(self, req: &Request) -> rocket::response::Result<'o> {
    let mut res = Json(&self).respond_to(req)?;
    res.set_status(self.status);
    Ok(res)
  }
}

#[macro_export]
macro_rules! get_state {
  () => {
    match State::get().await {
      Ok(state) => state,
      Err(_) => {
        return Err(DownloadError {
          status: Status::InternalServerError,
          kind: DownloadErrorKind::InternalError,
          message: String::from("Internal state error"),
        });
      }
    }
  }
}
