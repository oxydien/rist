use std::path::Path;

use serde::{Deserialize, Serialize};
use sqlx::{migrate::MigrateDatabase, sqlite::SqliteQueryResult, Sqlite, SqlitePool};

use crate::{state, utils};

pub struct UserDB {
    pub path: String,
    pool: SqlitePool,
}

impl UserDB {
    pub async fn init(path: &String) -> Result<Self, Box<dyn std::error::Error>> {
        if !Path::new(path).exists() {
            std::fs::create_dir_all(utils::get_directory_from_path(path).unwrap())?;
        }

        let sqlite_path = format!("sqlite://{}", path);

        if !Sqlite::database_exists(&sqlite_path).await.unwrap_or(false) {
            println!("[DEBUG ] Creating database {}", sqlite_path);
            match Sqlite::create_database(&sqlite_path).await {
                Ok(_) => println!("[INFO  ] Create db success"),
                Err(error) => panic!("[ERROR ] Could not create new UserDB database: {}", error),
            }
        }

        let pool = SqlitePool::connect(path).await?;

        sqlx::query(
            r"CREATE TABLE IF NOT EXISTS Users (
              id INTEGER PRIMARY KEY,
              name TEXT NOT NULL UNIQUE,
              kind INTEGER NOT NULL,
              token TEXT NOT NULL
            );",
        )
        .execute(&pool)
        .await
        .map_err(|e| {
            eprintln!(
                "[ERROR] Database 'UserDB' failed to create table 'Users': {}",
                e
            );
            e
        })?;

        // Delete all users; Users are synced via config
        sqlx::query("DELETE FROM Users").execute(&pool).await?;

        Ok(Self {
            path: sqlite_path,
            pool,
        })
    }

    pub async fn insert(
        &self,
        name: &str,
        kind: UserKind,
        token: &str,
    ) -> Result<SqliteQueryResult, sqlx::Error> {
        sqlx::query(r"INSERT INTO Users (name, kind, token) VALUES (?, ?, ?)")
            .bind(name)
            .bind(kind as i32)
            .bind(token)
            .execute(&self.pool)
            .await
    }

    pub async fn sync_with_config(&self) -> Result<(), Box<dyn std::error::Error>> {
        let state = state::State::get().await.unwrap();

        for user in state.config.accounts.user.iter() {
            self.insert(&user.name, user.kind.clone(), &user.token)
                .await?;
        }

        Ok(())
    }

    pub async fn get(&self, token: &str) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as::<_, User>("SELECT * FROM Users WHERE token = ?")
            .bind(token)
            .fetch_optional(&self.pool)
            .await
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum UserKind {
    Admin = 0,
    User = 1,
    Guest = 2,
    YtOnly = 3,
    FileOnly = 4,
}

impl UserKind {
    pub fn as_u8(&self) -> u8 {
        match self {
            UserKind::Admin => 0,
            UserKind::User => 1,
            UserKind::Guest => 2,
            UserKind::YtOnly => 3,
            UserKind::FileOnly => 4,
        }
    }

    pub fn from_u8(kind: u8) -> Self {
        match kind {
            0 => UserKind::Admin,
            1 => UserKind::User,
            2 => UserKind::Guest,
            3 => UserKind::YtOnly,
            4 => UserKind::FileOnly,
            _ => UserKind::Guest,
        }
    }
}

#[derive(sqlx::FromRow)]
pub struct User {
    pub id: i64,
    pub name: String,
    pub kind: u8,
    pub token: String,
}
