use std::{fs, io::Cursor, path::Path};

use rocket::{
    http::ContentType,
    response::{self, content::RawHtml},
    Request, Response,
};
use rocket_governor::RocketGovernor;

use crate::state::State;

use super::RateLimitGuard;

pub struct DownloadResponse {
    pub found: bool,
    pub finished: bool,
    pub filename: String,
    pub data: Vec<u8>,
}

impl DownloadResponse {
    pub fn default() -> Self {
        Self {
            found: false,
            finished: false,
            filename: String::new(),
            data: Vec::new(),
        }
    }
}

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

        res.set_header(ContentType::new("application", "octet-stream"));
        res.set_raw_header(
            "Content-Disposition",
            format!("attachment; filename=\"{}\"", self.filename),
        );
        res.set_sized_body(self.data.len(), Cursor::new(self.data));

        Ok(res)
    }
}

#[get("/f?<u>")]
pub async fn download_file<'r>(
    _rt: RocketGovernor<'r, RateLimitGuard>,
    u: String,
) -> DownloadResponse {
    let state = match State::get().await {
        Ok(state) => state,
        Err(_) => {
            return DownloadResponse::default();
        }
    };

    if state.upload_status.read().await.get(&u).is_some() {
        return DownloadResponse {
            found: true,
            finished: false,
            filename: String::new(),
            data: Vec::new(),
        };
    }

    let file = match state.file_db.get_by_uuid(&u).await {
        Ok(file) => match file {
            Some(file) => file,
            None => {
                return DownloadResponse::default();
            }
        },
        Err(_) => {
            return DownloadResponse::default();
        }
    };

    let path = Path::new(&file.path);
    let content = match fs::read(path) {
        Ok(content) => content,
        Err(_) => {
            return DownloadResponse::default();
        }
    };

    match state.file_db.increment_access_count(&u).await {
        Ok(_) => {}
        Err(_) => {
            return DownloadResponse::default();
        }
    }

    DownloadResponse {
        found: true,
        finished: true,
        filename: file.name,
        data: content,
    }
}
