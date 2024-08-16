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
            .merge(("address", state.config.server.host.clone()));
    }

    println!("[DEBUG ] Running before_launch...");
    before_launch().await;

    // Launch rocket server
    println!("[DEBUG ] Launching server...");
    rocket::custom(figment).mount("/", routes![])
}

async fn before_launch() {
    let state = State::get().await.unwrap();

    state.user_db.sync_with_config().await.unwrap();
}
