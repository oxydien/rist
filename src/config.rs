use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Read;
use std::path::Path;

use crate::db::user::UserKind;

#[derive(Serialize, Deserialize, Debug)]
pub struct Config {
    pub database: DatabaseConfig,
    pub server: ServerConfig,
    pub accounts: AccountsConfig,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DatabaseConfig {
    pub file_db_path: String,
    pub user_db_path: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AccountsConfig {
    pub user: Vec<UserConfig>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UserConfig {
    pub name: String,
    pub kind: UserKind,
    pub token: String,
}

impl Config {
    pub fn load(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let mut config = Config::default();

        if Path::new(path).exists() {
          let mut file = File::open(path)?;
          let mut contents = String::new();
          file.read_to_string(&mut contents)?;

          let file_config: Config = serde_json::from_str(&contents)?;

          config.merge(file_config);
        } else {
          println!("[WARN  ] Config file not found, creating default at: {}", Path::new(path).display());

          let config_json = serde_json::to_string_pretty(&config)?;
          std::fs::write(path, config_json)?;
        }
        
        Ok(config)
    }

    fn default() -> Self {
        Config {
            database: DatabaseConfig {
                file_db_path: String::from("db/files.db"),
                user_db_path: String::from("db/users.db"),
            },
            server: ServerConfig {
                host: String::from("0.0.0.0"),
                port: 3003,
            },
            accounts: AccountsConfig { user: vec![] },
        }
    }

    fn merge(&mut self, other: Config) {
        if !other.database.file_db_path.is_empty() {
            self.database.file_db_path = other.database.file_db_path;
        }
        if !other.database.user_db_path.is_empty() {
            self.database.user_db_path = other.database.user_db_path;
        }

        if !other.server.host.is_empty() {
            self.server.host = other.server.host;
        }
        if other.server.port != 0 {
            self.server.port = other.server.port;
        }

        if !other.accounts.user.is_empty() {
            self.accounts.user = other.accounts.user;
        }
    }
}
