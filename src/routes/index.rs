use rocket::fs::NamedFile;

use super::TokenAuth;

#[get("/")]
pub async fn index() -> Option<NamedFile> {
  NamedFile::open("frontend/index.html").await.ok()
}

#[get("/assets/index.css")]
pub async fn index_style() -> Option<NamedFile> {
  NamedFile::open("frontend/index.css").await.ok()
}

#[get("/assets/global.css")]
pub async fn global_style() -> Option<NamedFile> {
  NamedFile::open("frontend/global.css").await.ok()
}

#[get("/assets/Poppins.ttf")]
pub async fn poppins_font() -> Option<NamedFile> {
  NamedFile::open("frontend/assets/Poppins-Variable.ttf").await.ok()
}

#[get("/authorize")]
pub async fn authorization_page() -> Option<NamedFile> {
  NamedFile::open("frontend/authorization.html").await.ok()
}

#[get("/assets/authorization.css")]
pub async fn authorization_style() -> Option<NamedFile> {
  NamedFile::open("frontend/authorization.css").await.ok()
}

#[get("/dash")]
pub async fn dash(_auth: TokenAuth) -> Option<NamedFile> {
  NamedFile::open("frontend/dash.html").await.ok()
}

#[get("/assets/dash.css")]
pub async fn dash_style(_auth: TokenAuth) -> Option<NamedFile> {
  NamedFile::open("frontend/dash.css").await.ok()
}

#[get("/dash/upload")]
pub async fn dash_upload_file(_auth: TokenAuth) -> Option<NamedFile> {
  NamedFile::open("frontend/upload.html").await.ok()
}

#[get("/assets/upload.css")]
pub async fn upload_style(_auth: TokenAuth) -> Option<NamedFile> {
  NamedFile::open("frontend/upload.css").await.ok()
}

#[get("/assets/sha.js")]
pub async fn sha_js() -> Option<NamedFile> {
  NamedFile::open("frontend/assets/sha.js").await.ok()
}
