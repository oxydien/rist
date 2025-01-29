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

  // Redirect to index (bit bad...)
  (
    ContentType::HTML,
    r#"<html><head><meta http-equiv="refresh" content="0; url=/authorize?local=false&msg='The requested resource was not found'" /></head></html>"#.to_string(),
  )
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

  // Redirect to index (bit bad...)
  (
    ContentType::HTML,
    r#"<html><head><meta http-equiv="refresh" content="0; url=/authorize?local=false&msg='You don't have access for this page, try logging in'" /></head></html>"#.to_string(),
  )
}
