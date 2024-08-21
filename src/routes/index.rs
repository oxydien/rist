use rocket::fs::NamedFile;
use rocket_governor::RocketGovernor;

use super::{BaseRateLimitGuard, TokenAuth};

#[get("/")]
pub async fn index<'r>(_brl: RocketGovernor<'r, BaseRateLimitGuard>) -> Option<NamedFile> {
  NamedFile::open("frontend/index.html").await.ok()
}

#[get("/assets/index.css")]
pub async fn index_style<'r>(_brl: RocketGovernor<'r, BaseRateLimitGuard>) -> Option<NamedFile> {
  NamedFile::open("frontend/index.css").await.ok()
}

#[get("/assets/global.css")]
pub async fn global_style<'r>(_brl: RocketGovernor<'r, BaseRateLimitGuard>) -> Option<NamedFile> {
  NamedFile::open("frontend/global.css").await.ok()
}

#[get("/assets/Poppins.ttf")]
pub async fn poppins_font<'r>(_brl: RocketGovernor<'r, BaseRateLimitGuard>) -> Option<NamedFile> {
  NamedFile::open("frontend/assets/Poppins-Variable.ttf").await.ok()
}

#[get("/authorize")]
pub async fn authorization_page<'r>(_brl: RocketGovernor<'r, BaseRateLimitGuard>) -> Option<NamedFile> {
  NamedFile::open("frontend/authorization.html").await.ok()
}

#[get("/assets/authorization.css")]
pub async fn authorization_style<'r>(_brl: RocketGovernor<'r, BaseRateLimitGuard>) -> Option<NamedFile> {
  NamedFile::open("frontend/authorization.css").await.ok()
}

#[get("/dash")]
pub async fn dash(_auth: TokenAuth) -> Option<NamedFile> {
  NamedFile::open("frontend/dash.html").await.ok()
}

#[get("/assets/dash.css")]
pub async fn dash_style<'r>(_brl: RocketGovernor<'r, BaseRateLimitGuard>, _auth: TokenAuth) -> Option<NamedFile> {
  NamedFile::open("frontend/dash.css").await.ok()
}

#[get("/dash/upload")]
pub async fn dash_upload_file<'r>(_brl: RocketGovernor<'r, BaseRateLimitGuard>, _auth: TokenAuth) -> Option<NamedFile> {
  NamedFile::open("frontend/upload.html").await.ok()
}

#[get("/assets/upload.css")]
pub async fn upload_style<'r>(_brl: RocketGovernor<'r, BaseRateLimitGuard>, _auth: TokenAuth) -> Option<NamedFile> {
  NamedFile::open("frontend/upload.css").await.ok()
}

#[get("/assets/sha.js")]
pub async fn sha_js<'r>(_brl: RocketGovernor<'r, BaseRateLimitGuard>) -> Option<NamedFile> {
  NamedFile::open("frontend/assets/sha.js").await.ok()
}

#[get("/dash/youtube")]
pub async fn youtube_page<'r>(_brl: RocketGovernor<'r, BaseRateLimitGuard>, _auth: TokenAuth) -> Option<NamedFile> {
  NamedFile::open("frontend/youtube.html").await.ok()
}

#[get("/assets/youtube.css")]
pub async fn youtube_style<'r>(_brl: RocketGovernor<'r, BaseRateLimitGuard>, _auth: TokenAuth) -> Option<NamedFile> {
  NamedFile::open("frontend/youtube.css").await.ok()
}

#[get("/dash/medal")]
pub async fn medal_page<'r>(_brl: RocketGovernor<'r, BaseRateLimitGuard>, _auth: TokenAuth) -> Option<NamedFile> {
  NamedFile::open("frontend/medal.html").await.ok()
}
