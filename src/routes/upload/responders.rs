use std::io::Cursor;

use rocket::{http::Header, response, Request, Response};
use serde_json::json;

use crate::state::State;

use super::error::UploadError;

#[rocket::async_trait]
impl<'r, 'o: 'r> response::Responder<'r, 'o> for UploadError {
    fn respond_to(self, _: &Request) -> rocket::response::Result<'o> {
        let m_uuid = self.uuid.clone();
        if let Some(uuid) = self.uuid {
            // Remove the uploaded file
            tokio::spawn(async move {
                if let Ok(state) = State::get().await.map_err(|e| e.to_string()) {
                    state.remove_upload_status(&uuid).await;

                    let _ = state.file_db.remove_by_uuid(&uuid).await;
                }
            });
        }

        let mut res = Response::new();
        res.set_status(self.status);
        let body = json!({
            "status": self.status.code,
            "uuid": m_uuid,
            "kind": self.kind,
            "message": self.message
        });
        let body = serde_json::to_string(&body).unwrap();
        println!("[DEBUG ] (Upload Error) {}", &body);
        res.set_sized_body(body.len(), Cursor::new(body));
        res.set_header(Header::new("Content-Type", "application/json"));
        res.set_header(Header::new("X-RIST", format!("{} ({})", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"))));
        Ok(res)
    }
}
