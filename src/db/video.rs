use serde::Deserialize;
use sqlx::Row;
use sqlx::{migrate::MigrateDatabase, Sqlite, SqlitePool};
use std::path::Path;

use crate::utils;

pub struct VideoDB {
    pub path: String,
    pool: SqlitePool,
}

impl VideoDB {
    pub async fn init(path: &String) -> Result<Self, Box<dyn std::error::Error>> {
        if !Path::new(path).exists() {
            std::fs::create_dir_all(utils::get_directory_from_path(path).unwrap())?;
        }

        let sqlite_path = format!("sqlite://{}", path);

        if !Sqlite::database_exists(&sqlite_path).await.unwrap_or(false) {
            println!("[DEBUG ] Creating database {}", sqlite_path);
            match Sqlite::create_database(&sqlite_path).await {
                Ok(_) => println!("[DEBUG ] Create db success"),
                Err(error) => panic!("[ERROR ] Could not create new VideoDB database: {}", error),
            }
        }

        let pool = SqlitePool::connect(path).await?;

        sqlx::query(
            r"CREATE TABLE IF NOT EXISTS Videos (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL UNIQUE,
            vid_id TEXT NOT NULL,
            name TEXT NOT NULL,
            format INTEGER NOT NULL,
            quality INTEGER NOT NULL,
            path TEXT NOT NULL,
            created TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            user INTEGER NOT NULL
          );",
        )
        .execute(&pool)
        .await
        .map_err(|e| {
            eprintln!(
                "[ERROR] Database 'VideoDB' failed to create table 'Videos': {}",
                e
            );
            e
        })?;

        Ok(Self {
            path: sqlite_path,
            pool,
        })
    }

    pub async fn insert(
        &self,
        uuid: &str,
        vid_id: &str,
        name: &str,
        format: &str,
        quality: &str,
        path: &str,
        created: &str,
        expires_at: &str,
        user: &str,
    ) -> Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> {
        sqlx::query(
        "INSERT INTO Videos (uuid, vid_id, name, format, quality, path, created, expires_at, user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(uuid)
    .bind(vid_id)
    .bind(name)
    .bind(format)
    .bind(quality)
    .bind(path)
    .bind(created)
    .bind(expires_at)
    .bind(user)
    .execute(&self.pool)
    .await
    }

    pub async fn add(&self, video: &Video) -> Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> {
        sqlx::query(
            r"INSERT INTO Videos (uuid, vid_id, name, format, quality, path, created, expires_at, user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(video.uuid.clone())
        .bind(video.vid_id.clone())
        .bind(video.name.clone())
        .bind(video.format.clone())
        .bind(video.quality.clone())
        .bind(video.path.clone())
        .bind(video.created.clone())
        .bind(video.expires_at.clone())
        .bind(video.user)
        .execute(&self.pool)
        .await
    }

    pub async fn get_by_uuid(&self, uuid: &str) -> Result<Option<Video>, sqlx::Error> {
        sqlx::query_as::<_, Video>("SELECT * FROM Videos WHERE uuid = ?")
            .bind(uuid)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn get_expired_videos(&self) -> Result<Vec<Video>, sqlx::Error> {
        sqlx::query_as::<_, Video>("SELECT * FROM Videos WHERE expires_at < ? AND expires_at <> 0")
            .bind(utils::get_current_timestamp() as i64)
            .fetch_all(&self.pool)
            .await
    }

    pub async fn remove_by_uuid(&self, uuid: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM Videos WHERE uuid = ?")
            .bind(uuid)
            .execute(&self.pool)
            .await
            .map(|_| ())
    }

    pub async fn get_paths(&self) -> Result<Vec<String>, sqlx::Error> {
        sqlx::query("SELECT path FROM Videos")
            .fetch_all(&self.pool)
            .await
            .map(|rows| rows.into_iter().map(|row| row.get(0)).collect())
    }

    pub async fn update_data(&self, uuid: &str, video: &Video) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE Videos SET vid_id = ?, name = ?, format = ?, quality = ?, path = ?, created = ?, expires_at = ?, user = ? WHERE uuid = ?")
            .bind(video.vid_id.to_string())
            .bind(video.name.to_string())
            .bind(video.format)
            .bind(video.quality)
            .bind(video.path.to_string())
            .bind(video.created.to_string())
            .bind(video.expires_at.to_string())
            .bind(video.user)
            .bind(uuid)
            .execute(&self.pool)
            .await
            .map(|_| ())
    }
}

#[derive(sqlx::FromRow)]
pub struct Video {
    pub uuid: String,
    pub vid_id: String,
    pub name: String,
    pub format: u8,
    pub quality: u8,
    pub path: String,
    pub created: String,
    pub expires_at: String,
    pub user: u16,
}

impl Video {
    pub fn from_yt_json(json: serde_json::Value) -> Result<Self, Box<dyn std::error::Error>> {
        let vid_id = json.get("id").unwrap().as_str().unwrap().to_string();

        let name = json.get("title").unwrap().as_str().unwrap().to_string();

        let format = 0;
        let quality = 0;
        let path = "".to_string();
        let created = utils::get_current_timestamp().to_string();
        let expires_at = (utils::get_current_timestamp() + 65_321).to_string();
        let user = 0;

        Ok(Self {
            uuid: "".to_string(),
            vid_id,
            name,
            format,
            quality,
            path,
            created,
            expires_at,
            user,
        })
    }
}

#[derive(Deserialize)]
pub enum YoutubeKind {
    Video,
    AudioWav,
    AudioMp3,
}

impl YoutubeKind {
    pub fn as_str(&self) -> &str {
        match self {
            YoutubeKind::Video => "mp4",
            YoutubeKind::AudioWav => "wav",
            YoutubeKind::AudioMp3 => "mp3",
        }
    }

    pub fn to_u8(&self) -> u8 {
        match self {
            YoutubeKind::Video => 0,
            YoutubeKind::AudioWav => 1,
            YoutubeKind::AudioMp3 => 2,
        }
    }

    pub fn from_u8(value: u8) -> Self {
        match value {
            0 => YoutubeKind::Video,
            1 => YoutubeKind::AudioWav,
            2 => YoutubeKind::AudioMp3,
            _ => YoutubeKind::Video,
        }
    }

    pub fn is_audio(&self) -> bool {
        match self {
            YoutubeKind::AudioWav => true,
            YoutubeKind::AudioMp3 => true,
            _ => false,
        }
    }
}

#[derive(Deserialize)]
pub enum YoutubeQuality {
    Best,
    High,
    Medium,
    Worst,
}

impl YoutubeQuality {
    pub fn as_str_vid(&self) -> &str {
        match self {
            YoutubeQuality::Best => "bv+ba/b",
            YoutubeQuality::High => "bv*[height<=720]+ba/b[height<=720] / wv*+ba/w",
            YoutubeQuality::Medium => "bv*[height<=480]+ba/b[height<=480] / wv*+ba/w",
            YoutubeQuality::Worst => "+size,+br",
        }
    }

    pub fn as_str_audio(&self) -> &str {
        match self {
            YoutubeQuality::Best => "ba/b",
            YoutubeQuality::High => "ba/w",
            YoutubeQuality::Medium => "ba/w",
            YoutubeQuality::Worst => "+size,+br",
        }
    }

    pub fn to_u8(&self) -> u8 {
        match self {
            YoutubeQuality::Best => 0,
            YoutubeQuality::High => 1,
            YoutubeQuality::Medium => 2,
            YoutubeQuality::Worst => 3,
        }
    }

    pub fn from_u8(value: u8) -> Self {
        match value {
            0 => YoutubeQuality::Best,
            1 => YoutubeQuality::High,
            2 => YoutubeQuality::Medium,
            3 => YoutubeQuality::Worst,
            _ => YoutubeQuality::Best,
        }
    }

    pub fn use_selection(&self) -> bool {
        match self {
            YoutubeQuality::Best => false,
            YoutubeQuality::High => false,
            YoutubeQuality::Medium => false,
            YoutubeQuality::Worst => true,
        }
    }
}
