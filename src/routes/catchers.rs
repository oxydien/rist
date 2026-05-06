use rocket::response::Redirect;
use rocket::Request;

#[derive(Responder)]
pub enum CatcherResponse {
  #[response(content_type = "json")]
  Api(String),
  #[response(status = 302)]
  Redirect(Redirect)
}

#[catch(404)]
pub fn not_found(req: &Request) -> CatcherResponse {
  match req.routed_segment(0).ok_or("No segments") {
    Ok(segment) => {
      if segment == "api" {
        return CatcherResponse::Api(
          r#"{"status": 404, "error": "Not found"}"#.to_string(),
        );
      }
    }
    Err(_) => {}
  }

  CatcherResponse::Redirect(Redirect::to(format!("/?info=Could%20not%20find%20{}", req.uri().to_string())))
}

#[catch(401)]
pub fn unauthorized(req: &Request) -> CatcherResponse {
  match req.routed_segment(0).ok_or("No segments") {
    Ok(segment) => {
      if segment == "api" {
        return CatcherResponse::Api(
          r#"{"status": 401, "error": "Unauthorized"}"#.to_string(),
        );
      }
    }
    Err(_) => {}
  }

  CatcherResponse::Redirect(Redirect::to("/?local=false&msg='You don't have access for this page, try logging in'".to_string()))
}
