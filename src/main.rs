use actix_web::{App, HttpServer, Responder, get, web};
use serde::Serialize;

mod scraper;

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

#[get("/metadata/{url}")]
async fn metadata(url: web::Path<String>) -> impl Responder {
    let scraper = crate::scraper::Scraper::init(url.to_string());
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
