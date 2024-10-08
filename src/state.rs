use std::{collections::HashMap, sync::Arc};

use crate::{config::Config, db::{file::FileDB, user::UserDB, video::VideoDB}, routes::upload::UploadStatusMap};
use tokio::sync::{OnceCell, RwLock};

static APP_STATE: OnceCell<Arc<State>> = OnceCell::const_new();
pub struct State {
   pub file_db: FileDB,
   pub user_db: UserDB,
   pub video_db: VideoDB,
   pub config: Config,
   pub config_path: String,
   pub upload_status: UploadStatusMap,
}

impl State {

  pub async fn init() -> Result<(), Box<dyn std::error::Error>> {
    APP_STATE
        .get_or_try_init(Self::initialize_state)
        .await.map_err(|e| {eprintln!("[ERROR ] Failed to initialize state: {}", e); e})?;

    Ok(())
  }

  pub async fn get() -> Result<Arc<Self>, Box<dyn std::error::Error>> {
    if !APP_STATE.initialized() {
        while !APP_STATE.initialized() {}
    }

    Ok(Arc::clone(
      APP_STATE.get().expect("[EXPECT] State is not initialized!"),
    ))
  }

  pub fn initialized() -> bool {
    APP_STATE.initialized()
  }

  async fn initialize_state() -> Result<Arc<Self>, Box<dyn std::error::Error>> {
    println!("[INFO  ] Initializing State");
  
    let config_path = std::env::var("CONFIG_PATH").unwrap_or("./config.json".to_string());
    let config = Config::load(&config_path)?;
    let file_db = FileDB::init(&config.database.file_db_path).await?;
    let user_db = UserDB::init(&config.database.user_db_path).await?;
    let video_db = VideoDB::init(&config.database.video_db_path).await?;
    let upload_status = Arc::new(RwLock::new(HashMap::new()));

    Ok(Arc::new(Self {
      file_db,
      user_db,
      video_db,
      config,
      config_path,
      upload_status,
    }))
  }

  // Utils

  pub async fn remove_upload_status(&self, uuid: &str) {
    let mut upload_state = self.upload_status.write().await;
    upload_state.remove(uuid);
  }
}
