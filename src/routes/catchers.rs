use std::{fs::File, io::Read};

use rocket::{http::ContentType, Request};

#[catch(404)]
pub fn not_found(req: &Request) -> (ContentType, String) {
    match req.routed_segment(0).ok_or("No segments") {
        Ok(segment) => {
            if segment == "api" {
                return (
                    ContentType::JSON,
                    r#"{"status": 404, "error": "Not found"}"#.to_string(),
                );
            }
        }
        Err(_) => {}
    }

    let mut file = match File::open("frontend/404.html") {
        Ok(file) => file,
        Err(_) => return (ContentType::HTML, "404 Not Found".to_string()),
    };
    let mut contents = String::new();
    file.read_to_string(&mut contents).map_err(|_| {
      return (ContentType::HTML, "404 Not Found".to_string())
    }).unwrap();
    (ContentType::HTML, contents)
}

#[catch(401)]
pub fn unauthorized(req: &Request) -> (ContentType, String) {
    match req.routed_segment(0).ok_or("No segments") {
        Ok(segment) => {
            if segment == "api" {
                return (
                    ContentType::JSON,
                    r#"{"status": 401, "error": "Unauthorized"}"#.to_string(),
                );
            }
        }
        Err(_) => {}
    }

    let mut file = match File::open("frontend/401.html") {
        Ok(file) => file,
        Err(e) => {
          eprintln!("[ERROR ] 401 Catcher; Could not open file: {}", e);
          return (ContentType::HTML, "401 Unauthorized".to_string())
        },
    };
    let mut contents = String::new();
    file.read_to_string(&mut contents).map_err(|_| {
      return (ContentType::HTML, "401 Unauthorized".to_string())
    }).unwrap();
    (ContentType::HTML, contents)
}

