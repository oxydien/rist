use rocket::{http::Status, serde::json::Json};

use crate::state::State;

use super::UploadStatus;

pub async fn get_upload_status(
    upload_id: &str,
) -> Result<Json<UploadStatus>, Status> {
    let state = match State::get().await {
        Ok(state) => state,
        Err(_) => return Err(Status::InternalServerError),
    };

    let status_map = state.upload_status.read().await;
    if let Some(status) = status_map.get(upload_id) {
        Ok(Json(status.clone()))
    } else {
        Err(Status::NotFound)
    }
}
