use std::{
  fs::{self},
  io::Cursor,
  path::Path,
};

use rocket::{
  http::Status,
  response::{self, content::RawHtml},
  serde::json::Json,
  Request, Response,
};

use serde::Serialize;

use crate::file_type::FileType;

pub mod file;
pub mod info;
pub mod part;
pub mod routes;

#[derive(Serialize)]
pub enum DownloadErrorKind {
  NotFound,
  InternalError,
  NotReady,
  InvalidPartNumber,
  Forbidden,
}

#[derive(Serialize)]
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

// TODO: Rewrite
#[rocket::async_trait]
impl<'r, 'o: 'r> response::Responder<'r, 'o> for DownloadResponse {
  fn respond_to(self, req: &Request) -> rocket::response::Result<'o> {
    if !self.found {
      let path = Path::new("frontend/404.html");
      let content = fs::read_to_string(path).unwrap();
      return Ok(RawHtml(content).respond_to(req).unwrap());
    }

    if !self.finished {
      let path = Path::new("frontend/unfinished.html");
      let content = fs::read_to_string(path).unwrap();
      return Ok(RawHtml(content).respond_to(req).unwrap());
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
    let mut res = Json(&self).respond_to(req).unwrap();
    res.set_status(self.status);
    Ok(res)
  }
}
