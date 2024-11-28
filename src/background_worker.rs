use std::{path::Path, time::Duration};

use tokio::time::interval;

use crate::{state, utils};

pub fn init() -> Result<(), Box<dyn std::error::Error>> {
  tokio::spawn(async move {
    if let Err(e) = worker().await {
      eprintln!("(BW) Background worker fatal error: {}", e);
    }
  });
  Ok(())
}

async fn worker() -> Result<(), Box<dyn std::error::Error>> {
  let mut interval = interval(Duration::from_secs(600));

  loop {
    interval.tick().await;
    println!("[DEBUG ] (BW) Background worker running...");

    if let Err(e) = run_cleanup_iteration().await {
      eprintln!("(BW) Background worker error: {}", e);
      // continue
    }
  }
}

async fn run_cleanup_iteration() -> Result<(), Box<dyn std::error::Error>> {
  let state = state::State::get().await?;

  remove_expired_files(&state).await?;

  remove_expired_videos(&state).await?;

  remove_orphaned_files(&state).await?;

  cleanup_temp_folders(&state).await?;

  Ok(())
}

async fn remove_expired_files(state: &state::State) -> Result<(), Box<dyn std::error::Error>> {
  let rows = state.file_db.get_expired_files().await?;

  for row in rows {
    println!("[INFO  ] (BW) Removing expired file: {}", row.uuid);

    if let Err(e) = state.file_db.remove_by_uuid(&row.uuid).await {
      eprintln!("(BW) Error removing expired file {}: {}", row.uuid, e);
    }
  }

  Ok(())
}

async fn remove_expired_videos(state: &state::State) -> Result<(), Box<dyn std::error::Error>> {
  let rows = state.video_db.get_expired_videos().await?;

  for row in rows {
    println!("[INFO  ] (BW) Removing expired video: {}", row.uuid);

    if let Err(e) = state.video_db.remove_by_uuid(&row.uuid).await {
      eprintln!("(BW) Error removing expired video {}: {}", row.uuid, e);
    }
  }

  Ok(())
}

async fn remove_orphaned_files(state: &state::State) -> Result<(), Box<dyn std::error::Error>> {
  let upload_dir = &state.config.upload.upload_location;

  // Early return if upload directory doesn't exist
  if !Path::new(upload_dir).exists() {
    return Ok(());
  }

  // Collect valid file paths
  let valid_paths = collect_valid_paths(state).await?;

  // Remove orphaned files
  remove_files_not_in_database(upload_dir, &valid_paths)?;

  Ok(())
}

async fn collect_valid_paths(
  state: &state::State,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
  let file_paths = state.file_db.get_paths().await?;
  let video_paths = state.video_db.get_paths().await?;

  let paths = file_paths
    .into_iter()
    .filter_map(|path| utils::get_filename_from_path(&path))
    .chain(
      video_paths
        .into_iter()
        .filter_map(|path| utils::get_filename_from_path(&path)),
    )
    .filter(|path| !path.is_empty())
    .collect::<Vec<_>>();

  Ok(paths)
}

fn remove_files_not_in_database(
  upload_dir: &str,
  valid_paths: &[String],
) -> Result<(), Box<dyn std::error::Error>> {
  let entries = std::fs::read_dir(upload_dir)?;

  for entry in entries {
    let path = entry?.path();

    // Skip if not a file
    if !path.is_file() {
      continue;
    }

    // Get filename, skipping if unable to extract
    let entry_path = match utils::get_filename_from_path(path.to_str().unwrap_or("")) {
      // Skip if filename too long (yt-dlp)
      Some(p) if p.len() <= 54 => p,
      _ => continue,
    };

    // Remove file if not in valid paths
    if !valid_paths.contains(&entry_path) {
      println!("[INFO  ] (BW) Removing file: {}", &entry_path);

      if let Err(e) = std::fs::remove_file(&path) {
        eprintln!("(BW) Error removing file {}: {}", entry_path, e);
      }
    }
  }

  Ok(())
}

async fn cleanup_temp_folders(state: &state::State) -> Result<(), Box<dyn std::error::Error>> {
  let upload_dir = &state.config.upload.upload_location;
  let upload_path = Path::new(upload_dir);

  // Early return if upload directory doesn't exist
  if !upload_path.exists() {
    return Ok(());
  }
  let temp_dir = upload_path.join("temp");

  // Check for inner files or directories
  let mut entries = tokio::fs::read_dir(&temp_dir).await?;

  // If entry has been there for 24 hours, remove it
  while let Ok(entry) = entries.next_entry().await {
    if let Some(file_entry) = entry {
      let path = file_entry.path();

      let entry_path = path.to_str().unwrap_or("");

      if let Ok(metadata) = tokio::fs::metadata(entry_path).await {
        if let Ok(modified) = metadata.modified() {
          if let Ok(elapsed) = modified.elapsed() {
            if elapsed.as_secs() > 86400 {
              println!("[INFO  ] (BW) Removing temp directory: {}", entry_path);

              if let Err(e) = tokio::fs::remove_dir_all(entry_path).await {
                eprintln!("(BW) Error removing temp directory {}: {}", entry_path, e);
              }
            }
          }
        }
      }
    }
  }

  Ok(())
}
