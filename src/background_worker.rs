use std::{path::Path, time::Duration};

use tokio::time::interval;

use crate::{state, utils};

pub fn init() -> Result<(), Box<dyn std::error::Error>> {
    tokio::spawn(async move {
        match worker().await {
            Ok(_) => {}
            Err(e) => eprintln!("(BW) Background worker start error: {}", e),
        }
    });
    Ok(())
}

async fn worker() -> Result<(), Box<dyn std::error::Error>> {
    let mut interval = interval(Duration::from_secs(600));
    loop {
        interval.tick().await;
        println!("[DEBUG ] (BW) Background worker running...");
        match iteration().await {
            Ok(_) => {}
            Err(e) => eprintln!("(BW) Background worker error: {}", e),
        }
    }
}

async fn iteration() -> Result<(), Box<dyn std::error::Error>> {
    // Check databases for expired rows
    let state = state::State::get().await?;

    let rows = state.file_db.get_expired_files().await?;
    for row in rows {
        println!("[INFO  ] (BW) Removing expired file: {}", row.uuid);
        state.file_db.remove_by_uuid(&row.uuid).await?;
    }

    let rows = state.video_db.get_expired_videos().await?;
    for row in rows {
        println!("[INFO  ] (BW) Removing expired video: {}", row.uuid);
        state.video_db.remove_by_uuid(&row.uuid).await?;
    }

    // Remove files not included in the database
    let upload_dir = &state.config.upload.upload_location;

    if !Path::new(upload_dir).exists() {
        return Ok(());
    }

    let file_paths = state.file_db.get_paths().await?;
    let video_paths = state.video_db.get_paths().await?;
    let paths = file_paths
        .into_iter()
        .map(|path| utils::get_filename_from_path(&path).unwrap())
        .chain(
            video_paths
                .into_iter()
                .map(|path| utils::get_filename_from_path(&path).unwrap()),
        )
        .collect::<Vec<_>>();

    let entries = std::fs::read_dir(upload_dir)?;

    for entry in entries {
        let path = entry?.path();

        if path.is_file() {
            let entry_path =
                utils::get_filename_from_path(path.to_str().unwrap()).unwrap_or(String::new());

            // Skip files that are too long
            // so the background worker does not mess with yt-dlp
            if entry_path.len() > 54 {
                continue;
            }

            if !paths.contains(&entry_path) {
                println!("[INFO  ] (BW) Removing file: {}", &entry_path);
                std::fs::remove_file(path)?;
            }
        }
    }

    Ok(())
}
