use std::{
    fs, io,
    path::{Path, PathBuf},
};

pub fn get_directory_from_path(path: &str) -> Option<String> {
    let path: &Path = Path::new(path);
    path.parent().map(|p| p.to_str().unwrap().to_string())
}

pub fn get_current_timestamp() -> u64 {
    std::time::SystemTime::UNIX_EPOCH.elapsed().unwrap().as_secs()
}

pub fn get_filename_from_path(path: &str) -> Option<String> {
    let path: &Path = Path::new(path);
    path.file_name().map(|p| p.to_str().unwrap().to_string())
}

pub fn get_file_with_extension(input_path: &str) -> Result<Option<PathBuf>, io::Error> {
    let file = Path::new(input_path);

    let parent = file.parent().unwrap();

    let entries = fs::read_dir(parent).unwrap();
    let mut target_file_path: Option<PathBuf> = None;

    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };
        let path = entry.path();

        if path.is_file()
            && path
                .file_name()
                .unwrap()
                .to_str()
                .unwrap()
                .starts_with(get_filename_from_path(input_path).as_ref().unwrap())
        {
            target_file_path = Some(path);
            break;
        }
    }

    Ok(target_file_path)
}

pub fn get_extension_from_path(path: &str) -> Option<String> {
    path.split(".").last().map(|p| p.to_string())
}
