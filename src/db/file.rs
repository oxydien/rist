use std::path::Path;
use serde::Serialize;
use sqlx::{migrate::MigrateDatabase, Sqlite, SqlitePool};

use crate::utils;


pub struct FileDB {
    pub path: String,
    pool: SqlitePool,
}

impl FileDB {
    pub async fn init(path: &String) -> Result<Self, Box<dyn std::error::Error>> {
        if !Path::new(path).exists() {
            std::fs::create_dir_all(utils::get_directory_from_path(path).unwrap())?;
        }

        let sqlite_path = format!("sqlite://{}", path);

        if !Sqlite::database_exists(&sqlite_path).await.unwrap_or(false) {
            println!("Creating database {}", sqlite_path);
            match Sqlite::create_database(&sqlite_path).await {
                Ok(_) => println!("[INFO  ] Create db success"),
                Err(error) => panic!("[ERROR ] Could not create new FileDB database: {}", error),
            }
        }

        let pool = SqlitePool::connect(path).await?;
        
        sqlx::query(
            r"CREATE TABLE IF NOT EXISTS Files (
              id INTEGER PRIMARY KEY,
              hash TEXT NOT NULL,
              uuid TEXT NOT NULL UNIQUE,
              path TEXT NOT NULL,
              name TEXT NOT NULL,
              size INTEGER NOT NULL,
              created TEXT NOT NULL,
              expires_at TEXT NOT NULL,
              access_count INTEGER NOT NULL
            );",
        ).execute(&pool)
        .await
          .map_err(|e| {
            eprintln!(
                "[ERROR] Database 'FileDB' failed to create table 'Files': {}",
                e
            );
            e
        })?;

        Ok(Self {
            path: sqlite_path,
            pool,
        })
    }

    pub async fn add_from_request(&self, uuid: &str, file_name: String, file_size: u64, expires_at: u64) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO Files (uuid, path, hash, name, size, created, expires_at, access_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(uuid)
            .bind(self.path.clone())
            .bind("-")
            .bind(file_name)
            .bind(file_size as i64)
            .bind(utils::get_current_timestamp() as i64)
            .bind(expires_at as i64)
            .bind(0)
            .execute(&self.pool)
            .await
            .map(|_| ())
    }

    pub async fn get_by_uuid(&self, uuid: &str) -> Result<Option<File>, sqlx::Error> {
        sqlx::query_as::<_, File>("SELECT * FROM Files WHERE uuid = ?")
            .bind(uuid)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn get_by_hash(&self, hash: &str) -> Result<Option<File>, sqlx::Error> {
        if hash == "-" {
            return Ok(None);
        }
        sqlx::query_as::<_, File>("SELECT * FROM Files WHERE hash = ?")
            .bind(hash)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn update_data(&self, uuid: &str, file: File) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE Files SET hash = ?, path = ?, name = ?, size = ?, created = ?, expires_at = ?, access_count = ? WHERE uuid = ?")
            .bind(file.hash)
            .bind(file.path)
            .bind(file.name)
            .bind(file.size)
            .bind(file.created)
            .bind(file.expires_at)
            .bind(file.access_count)
            .bind(uuid)
            .execute(&self.pool)
            .await
            .map(|_| ())
    }

    pub async fn increment_access_count(&self, uuid: &str) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE Files SET access_count = access_count + 1 WHERE uuid = ?")
            .bind(uuid)
            .execute(&self.pool)
            .await
            .map(|_| ())
    }

    pub async fn remove_by_uuid(&self, uuid: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM Files WHERE uuid = ?")
            .bind(uuid)
            .execute(&self.pool)
            .await
            .map(|_| ())
    }
}

#[derive(sqlx::FromRow)]
pub struct File {
    pub id: i64,
    pub hash: String,
    pub path: String,
    pub uuid: String,
    pub name: String,
    pub size: i64,
    pub created: String,
    pub expires_at: String,
    pub access_count: i64,
}

#[derive(Serialize, Clone, PartialEq)]
pub enum FileState {
    AwaitingData,
    Uploading,
    Finishing,
    Error,
    UploadCancelled,
}

impl FileState {
    pub fn as_u8(&self) -> u8 {
        match self {
            FileState::AwaitingData => 0,
            FileState::Uploading => 1,
            FileState::Finishing => 2,
            FileState::Error => 3,
            FileState::UploadCancelled => 4,
        }
    }

    pub fn from_u8(state: u8) -> Self {
        match state {
            0 => FileState::AwaitingData,
            1 => FileState::Uploading,
            2 => FileState::Finishing,
            3 => FileState::Error,
            4 => FileState::UploadCancelled,
            _ => FileState::AwaitingData,
        }
    }
}
