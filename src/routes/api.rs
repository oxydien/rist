use rocket::http::Status;
use rocket::serde::json::Json;
use rocket_governor::RocketGovernor;
use serde::{Deserialize, Serialize};

use crate::{db::user::User, state};

use super::StrictRateLimitGuard;

#[derive(Deserialize, FromForm)]
pub struct AuthorizeRequest {
    pub token: String,
}

#[derive(Serialize)]
pub struct AuthorizeResponse {
    role: u8,
}

#[post("/api/authorize", format = "json", data = "<data>")]
pub async fn authorize<'r>(
    _srt: RocketGovernor<'r, StrictRateLimitGuard>,
    data: Json<AuthorizeRequest>,
) -> Result<Json<AuthorizeResponse>, Status> {
    let user = match check_auth(&data.0.token).await {
        Ok(user) => user,
        Err(status) => return Err(status),
    };
    Ok(Json(AuthorizeResponse { role: user.kind }))
}

pub async fn check_auth(token: &String) -> Result<User, Status> {
    let state = match state::State::get().await {
        Ok(state) => state,
        Err(_) => return Err(Status::InternalServerError),
    };

    let user = match state.user_db.get(&token).await {
        Ok(maybe_user) => match maybe_user {
            Some(user) => user,
            None => return Err(Status::Unauthorized),
        },
        Err(_) => return Err(Status::Unauthorized),
    };
    Ok(user)
}
