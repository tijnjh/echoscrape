mod scraper;

use actix_web::{App, HttpServer, Responder, get, web};
use serde::Serialize;

#[derive(Serialize)]
struct IndexGreeting {
    name: String,
    about: Option<String>,
    repo: Option<String>,
    license: Option<String>,
}

#[get("/")]
async fn index() -> impl Responder {
    web::Json(IndexGreeting {
        name: "hi".to_string(),
        about: Some("".to_string()),
        repo: None,
        license: None,
    })
}

#[get("/{name}")]
async fn hello(name: web::Path<String>) -> impl Responder {
    format!("Hello {}!", &name)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| App::new().service(index).service(hello))
        .bind(("127.0.0.1", 8080))?
        .run()
        .await
}
