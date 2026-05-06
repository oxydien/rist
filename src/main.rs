use rocket::data::ToByteUnit;
use rocket::http::Method;
use rocket_cors::{AllowedOrigins, CorsOptions};
use rocket_governor::rocket_governor_catcher;
use state::State;
use utils::get_software_name;

#[macro_use]
extern crate rocket;

pub mod background_worker;
pub mod config;
pub mod db;
pub mod file_type;
pub mod log;
pub mod module;
pub mod routes;
pub mod state;
pub mod utils;

#[cfg(test)]
mod tests;

#[launch]
async fn rocket() -> _ {
  // Startup
  log_i!("Starting {}", get_software_name());
  log_i!("Version: {}", env!("CARGO_PKG_VERSION"));
  log_i!("Time: {}", utils::get_current_timestamp());

  // Setup main state
  let _ = state::State::init().await.map_err(|e| {
    log_e!("Failed to initialize main state: {}", e);
    panic!("Failed to initialize main state");
  });

  log_d!("Configuring server...");
  // Setup rocket config
  let figment: rocket::figment::Figment;
  let allow_cors;
  {
    let state = State::get().await.unwrap();
    figment = rocket::Config::figment()
      .merge(("port", state.config.server.port.clone()))
      .merge(("address", state.config.server.host.clone()))
      .merge((
        "limits",
        rocket::data::Limits::new()
          .limit("data-form", 10.gigabytes())
          .limit("file", 10.gigabytes()),
      ));

    allow_cors = state.config.server.allow_all_origins.clone();
  }
  log_d!("Starting background worker...");
  background_worker::init().unwrap();

  log_d!("Running before_launch...");
  before_launch().await;

  // Launch rocket server
  log_d!("Launching server...");

  // Cors (used for ui dev)
  let cors = CorsOptions::default()
    .allowed_origins(AllowedOrigins::all())
    .allowed_methods(
      vec![Method::Get, Method::Post]
        .into_iter()
        .map(From::from)
        .collect(),
    )
    .allow_credentials(true);

  let mut builder = rocket::custom(figment)
    .register(
      "/",
      catchers![
        routes::catchers::not_found,
        routes::catchers::unauthorized,
        rocket_governor_catcher
      ],
    )
    .mount(
      "/",
      routes![
        routes::index::index,
        routes::index::authorize_page,
        routes::index::file_page,
        routes::index::file_page_short,
        routes::index::robots_txt,
        routes::index::dashboard_page,
        routes::index::dashboard_pages,
        routes::index::styles,
        routes::index::assets,
        routes::api::authorize,
        routes::server_info::get_info_route,
        routes::upload::routes::upload_file_whole,
        routes::upload::routes::get_upload_status,
        routes::upload::routes::request_upload,
        routes::upload::routes::upload_file_part,
        routes::download::routes::get_download_info,
        routes::download::routes::download_entire_file,
        routes::download::routes::download_file_part,
        routes::youtube::youtube_request,
        routes::youtube::youtube_download,
        routes::medal::download_medal_clip,
      ],
    );

  if allow_cors {
    builder = builder.attach(cors.to_cors().unwrap());
  }

  log_d!("Awaiting rocket...");
  builder
}

async fn before_launch() {
  let state = State::get().await.unwrap();

  state.user_db.sync_with_config().await.unwrap();
}
