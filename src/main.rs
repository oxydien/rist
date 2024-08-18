use rocket::data::ToByteUnit;
use rocket_governor::rocket_governor_catcher;
use state::State;

#[macro_use]
extern crate rocket;

pub mod config;
pub mod db;
pub mod routes;
pub mod state;
pub mod utils;

#[launch]
async fn rocket() -> _ {
    println!("[INFO  ] Starting {}", env!("CARGO_PKG_NAME"));

    // Setup main state
    let _ = state::State::init().await.map_err(|e| {
        eprintln!("[FATAL ] Failed to initialize main state: {}", e);
        panic!("Failed to initialize main state");
    });

    println!("[DEBUG ] Configuring server...");
    // Setup rocket config
    let figment: rocket::figment::Figment;
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
    }

    println!("[DEBUG ] Running before_launch...");
    before_launch().await;

    // Launch rocket server
    println!("[DEBUG ] Launching server...");
    rocket::custom(figment)
        .register(
            "/",
            catchers![routes::catchers::not_found, routes::catchers::unauthorized, rocket_governor_catcher],
        )
        .mount(
            "/",
            routes![
                routes::index::index,
                routes::index::index_style,
                routes::index::global_style,
                routes::index::poppins_font,
                routes::index::authorization_page,
                routes::index::authorization_style,
                routes::index::dash,
                routes::index::dash_style,
                routes::index::dash_upload_file,
                routes::index::upload_style,
                routes::index::sha_js,
                routes::api::authorize,
                routes::upload::request_upload,
                routes::upload::upload_file,
                routes::upload::get_upload_status,
                routes::download::download_file,
            ],
        )
}

async fn before_launch() {
    let state = State::get().await.unwrap();

    state.user_db.sync_with_config().await.unwrap();
}
