use rocket::{
    http::Status,
    request::{FromRequest, Outcome},
    Request,
};
use rocket_governor::{Quota, RocketGovernable};

use crate::{db::user::User, state::State};

pub mod api;
pub mod catchers;
pub mod download;
pub mod index;
pub mod upload;
pub mod youtube;
pub mod medal;

pub struct TokenAuth(User);

#[derive(Debug)]
pub enum AuthError {
    Missing,
    Invalid,
    ServerError,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for TokenAuth {
    type Error = AuthError;

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let state = match State::get().await {
            Ok(val) => val,
            Err(_) => return Outcome::Error((Status::InternalServerError, AuthError::ServerError)),
        };

        match request.cookies().get("token") {
            Some(token_cookie) => match state.user_db.get(&token_cookie.value()).await {
                Ok(maybe_user) => match maybe_user {
                    Some(user) => return Outcome::Success(TokenAuth(user)),
                    None => return Outcome::Error((Status::Unauthorized, AuthError::Invalid)),
                },
                Err(_) => {
                    return Outcome::Error((Status::InternalServerError, AuthError::ServerError))
                }
            },
            None => Outcome::Error((Status::Unauthorized, AuthError::Missing)),
        }
    }
}

pub struct BaseRateLimitGuard;
pub struct RateLimitGuard;
pub struct StrictRateLimitGuard;

impl<'r> RocketGovernable<'r> for BaseRateLimitGuard {
    fn quota(_method: rocket_governor::Method, _route_name: &str) -> Quota {
        Quota::per_minute(Self::nonzero(70))
    }
}

impl<'r> RocketGovernable<'r> for RateLimitGuard {
    fn quota(_method: rocket_governor::Method, _route_name: &str) -> Quota {
        Quota::per_minute(Self::nonzero(10))
    }
}

impl<'r> RocketGovernable<'r> for StrictRateLimitGuard {
    fn quota(_method: rocket_governor::Method, _route_name: &str) -> Quota {
        Quota::per_minute(Self::nonzero(2))
    }
}
