use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::File;
use std::io::Read;
use std::path::Path;

use crate::db::user::UserKind;

#[derive(Serialize, Deserialize, Debug)]
pub struct Config {
    pub database: DatabaseConfig,
    pub server: ServerConfig,
    pub accounts: AccountsConfig,
    pub upload: UploadConfig,
    pub yt_dlp: YtDlpConfig,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DatabaseConfig {
    pub file_db_path: String,
    pub user_db_path: String,
    pub video_db_path: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UploadConfig {
    pub max_size_bytes: i64,
    pub upload_location: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct YtDlpConfig {
    pub enabled: bool,
    pub dpl_exec_path: String,
    pub dpl_args: Vec<String>,
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

            let file_config: Value = serde_json::from_str(&contents)?;

            config.merge(&file_config);
        } else {
            println!(
                "[WARN  ] Config file not found, creating default at: {}",
                Path::new(path).display()
            );
        }

        let config_json = serde_json::to_string_pretty(&config)?;
        std::fs::write(path, config_json)?;

        Ok(config)
    }

    fn default() -> Self {
        Config {
            database: DatabaseConfig {
                file_db_path: String::from("db/files.db"),
                user_db_path: String::from("db/users.db"),
                video_db_path: String::from("db/videos.db"),
            },
            server: ServerConfig {
                host: String::from("0.0.0.0"),
                port: 3003,
            },
            accounts: AccountsConfig {
                user: vec![UserConfig {
                    name: String::from("CHANGE_ME"),
                    kind: UserKind::Admin,
                    token: String::from("admin"),
                }],
            },
            upload: UploadConfig {
                max_size_bytes: 100 * 1024 * 1024, // 100 MB
                upload_location: String::from("./files/"),
            },
            yt_dlp: YtDlpConfig {
                enabled: false,
                dpl_exec_path: String::from("yt-dlp"),
                dpl_args: vec![],
            },
        }
    }

    fn merge(&mut self, other: &Value) {
        for (key, value) in other.as_object().unwrap().iter() {
            match key.as_str() {
                "database" => {
                    if let Some(db_value) = value.as_object() {
                        self.database.file_db_path =
                            db_value["file_db_path"].as_str().unwrap_or("").to_string();
                        self.database.user_db_path =
                            db_value["user_db_path"].as_str().unwrap_or("").to_string();
                        self.database.video_db_path =
                            db_value["video_db_path"].as_str().unwrap_or("").to_string();
                    }
                }
                "server" => {
                    if let Some(server_value) = value.as_object() {
                        self.server.host = server_value["host"].as_str().unwrap_or("").to_string();
                        self.server.port = server_value["port"].as_u64().unwrap_or(0) as u16;
                    }
                }
                "accounts" => {
                    if let Some(accounts_value) = value.as_array() {
                        self.accounts.user.clear(); // Clear existing users
                        for account in accounts_value {
                            if let Some(account_obj) = account.as_object() {
                                let name = account_obj["name"].as_str().unwrap_or("").to_string();
                                let kind = account_obj["kind"].as_str().unwrap_or("guest");
                                let token = account_obj["token"].as_str().unwrap_or("").to_string();
                                self.accounts.user.push(UserConfig {
                                    name,
                                    kind: UserKind::from_str(kind),
                                    token,
                                });
                            }
                        }
                    }
                }
                "upload" => {
                    if let Some(upload_value) = value.as_object() {
                        self.upload.max_size_bytes =
                            upload_value["max_size_bytes"].as_i64().unwrap_or(0);
                        self.upload.upload_location = upload_value["upload_location"]
                            .as_str()
                            .unwrap_or("")
                            .to_string();
                    }
                }
                "yt_dlp" => {
                    if let Some(yt_dlp_value) = value.as_object() {
                        self.yt_dlp = YtDlpConfig {
                            enabled: yt_dlp_value["enabled"].as_bool().unwrap_or(false),
                            dpl_exec_path: yt_dlp_value["dpl_exec_path"]
                                .as_str()
                                .unwrap_or("")
                                .to_string(),
                            dpl_args: yt_dlp_value["dpl_args"]
                                .as_array()
                                .unwrap_or(&Vec::new())
                                .iter()
                                .map(|arg| arg.as_str().unwrap_or("").to_string())
                                .collect::<Vec<_>>(),
                        };
                    }
                }
                _ => {}
            }
        }
    }
}
