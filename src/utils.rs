use std::path::Path;


pub fn get_directory_from_path(path: &str) -> Option<String> {
  let path = Path::new(path);
  path.parent().map(|p| p.to_str().unwrap().to_string())
}
