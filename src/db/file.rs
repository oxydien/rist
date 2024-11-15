use serde_repr::Serialize_repr;
use sqlx::{migrate::MigrateDatabase, Sqlite, SqlitePool};
use sqlx::{prelude::FromRow, sqlite::SqliteRow, Row};
use std::path::Path;

use crate::{routes::upload::UploadMethod, state, utils};

use super::utils::ensure_table_schema;
use super::TableColumn;

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
      println!("[DEBUG ] Creating database {}", sqlite_path);
      match Sqlite::create_database(&sqlite_path).await {
        Ok(_) => println!("[DEBUG ] Create db success"),
        Err(error) => panic!("[ERROR ] Could not create new FileDB database: {}", error),
      }
    }

    let pool = SqlitePool::connect(path).await?;

    let table_columns: Vec<TableColumn> = vec![
      TableColumn {
        name: "id",
        data_type: "INTEGER PRIMARY KEY",
        default_value: None,
      },
      TableColumn {
        name: "hash",
        data_type: "TEXT NOT NULL",
        default_value: None,
      },
      TableColumn {
        name: "uuid",
        data_type: "TEXT NOT NULL UNIQUE",
        default_value: None,
      },
      TableColumn {
        name: "path",
        data_type: "TEXT NOT NULL",
        default_value: None,
      },
      TableColumn {
        name: "name",
        data_type: "TEXT NOT NULL",
        default_value: None,
      },
      TableColumn {
        name: "size",
        data_type: "INTEGER NOT NULL",
        default_value: None,
      },
      TableColumn {
        name: "created",
        data_type: "TEXT NOT NULL",
        default_value: None,
      },
      TableColumn {
        name: "expires_at",
        data_type: "TEXT NOT NULL",
        default_value: None,
      },
      TableColumn {
        name: "access_count",
        data_type: "INTEGER NOT NULL",
        default_value: None,
      },
      TableColumn {
        name: "upload_method",
        data_type: "INTEGER NOT NULL",
        default_value: Some("1"),
      },
      TableColumn {
        name: "file_state",
        data_type: "INTEGER NOT NULL",
        default_value: Some("5"), // 5 = complete
      },
    ];

    ensure_table_schema(&pool, "Files", &table_columns).await?;

    Ok(Self {
      path: sqlite_path,
      pool,
    })
  }

  pub async fn add_from_request(
    &self,
    uuid: &str,
    file_name: String,
    file_size: u64,
    expires_at: u64,
    upload_method: UploadMethod,
  ) -> Result<(), sqlx::Error> {
    let state = state::State::get()
      .await
      .map_err(|_| sqlx::Error::WorkerCrashed)?;

    let path = format!("{}{}", state.config.upload.upload_location, uuid);

    sqlx::query("INSERT INTO Files (uuid, path, hash, name, size, created, expires_at, access_count, upload_method, file_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(uuid)
            .bind(path)
            .bind("-")
            .bind(file_name)
            .bind(file_size as i64)
            .bind(utils::get_current_timestamp() as i64)
            .bind(expires_at as i64)
            .bind(0)// access_count
            .bind(upload_method.as_u8()) 
            .bind(FileState::AwaitingData.as_u8())
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
    sqlx::query("UPDATE Files SET hash = ?, path = ?, name = ?, size = ?, created = ?, expires_at = ?, access_count = ?, file_state = ?, upload_method = ? WHERE uuid = ?")
            .bind(file.hash)
            .bind(file.path)
            .bind(file.name)
            .bind(file.size)
            .bind(file.created)
            .bind(file.expires_at)
            .bind(file.access_count)
            .bind(file.state.as_u8())
            .bind(file.upload_method.as_u8())
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

  pub async fn get_expired_files(&self) -> Result<Vec<File>, sqlx::Error> {
    sqlx::query_as::<_, File>("SELECT * FROM Files WHERE expires_at < ? AND expires_at <> 0")
      .bind(utils::get_current_timestamp() as i64)
      .fetch_all(&self.pool)
      .await
  }

  pub async fn get_paths(&self) -> Result<Vec<String>, sqlx::Error> {
    sqlx::query("SELECT path FROM Files")
      .fetch_all(&self.pool)
      .await
      .map(|rows| rows.into_iter().map(|row| row.get(0)).collect())
  }

  pub async fn update_state(&self, uuid: &str, state: FileState) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE Files SET file_state = ? WHERE uuid = ?")
      .bind(state.as_u8())
      .bind(uuid)
      .execute(&self.pool)
      .await
      .map(|_| ())
  }
}

// MARK: File
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
  /// Use [state::State::upload_status] instead (this can not update properly)
  pub state: FileState,
  pub upload_method: UploadMethod,
}

impl FromRow<'_, SqliteRow> for File {
  fn from_row(row: &'_ SqliteRow) -> Result<Self, sqlx::Error> {
    Ok(Self {
      id: row.get(0),
      hash: row.get(1),
      path: row.get(2),
      uuid: row.get(3),
      name: row.get(4),
      size: row.get(5),
      created: row.get(6),
      expires_at: row.get(7),
      access_count: row.get(8),
      state: FileState::from_u8(row.get(9)),
      upload_method: UploadMethod::from_u8(row.get(9)),
    })
  }
}

#[derive(Serialize_repr, Clone, PartialEq)]
#[repr(u8)]
pub enum FileState {
  AwaitingData,
  Uploading,
  Finishing,
  Error,
  UploadCancelled,
  Completed,
}

impl FileState {
  pub fn as_u8(&self) -> u8 {
    match self {
      FileState::AwaitingData => 0,
      FileState::Uploading => 1,
      FileState::Finishing => 2,
      FileState::Error => 3,
      FileState::UploadCancelled => 4,
      FileState::Completed => 5,
    }
  }

  pub fn from_u8(state: u8) -> Self {
    match state {
      0 => FileState::AwaitingData,
      1 => FileState::Uploading,
      2 => FileState::Finishing,
      3 => FileState::Error,
      4 => FileState::UploadCancelled,
      5 => FileState::Completed,
      _ => FileState::AwaitingData,
    }
  }
}
