use std::path::Path;

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
              hash TEXT NOT NULL UNIQUE,
              path TEXT NOT NULL UNIQUE,
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

    pub async fn insert(&self, file: &File) -> Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> {
        sqlx::query("INSERT INTO Files (hash, path, name, size, created, expires_at, access_count) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(&file.hash)
            .bind(&file.path)
            .bind(&file.name)
            .bind(&file.size)
            .bind(&file.created)
            .bind(&file.expires_at)
            .bind(&file.access_count)
            .execute(&self.pool)
            .await
    }
}

#[derive(sqlx::FromRow)]
pub struct File {
    pub id: i64,
    pub hash: String,
    pub path: String,
    pub name: String,
    pub size: i64,
    pub created: String,
    pub expires_at: String,
    pub access_count: i64,
}
