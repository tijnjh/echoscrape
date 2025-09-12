use actix_web::http::Uri;
use std::str::FromStr;
use tl::{Node, NodeHandle, VDomGuard, queryselector::iterable::QueryIterable};

fn validate_url(mut raw_url: String) -> Result<actix_web::http::Uri, Box<dyn std::error::Error>> {
    if raw_url.starts_with("/") {
        raw_url = raw_url[..raw_url.len() - 1].to_owned();
    }

    let re = regex::Regex::new(r"(?i)^https?://")?;

    if !re.is_match(&raw_url) {
        raw_url = format!("http://{}", raw_url);
    }

    let parsed_url = Uri::from_str(&raw_url)?;

    if let Some(host) = parsed_url.host() {
        if ["localhost", "127.0.0.1", "::1"].contains(&host) {
            return Err("access to localhost not allowed".into());
        }
    }

    Ok(parsed_url)
}

pub struct Scraper {
    url: Uri,
    root: VDomGuard,
}

impl Scraper {
    pub async fn init(url: String) -> Result<Scraper, Box<dyn std::error::Error>> {
        let valid_url = validate_url(url)?;
        let html = reqwest::get(valid_url.to_string()).await?.text().await?;

        unsafe {
            let dom = tl::parse_owned(html, tl::ParserOptions::default())?;

            Ok(Self {
                url: valid_url,
                root: dom,
            })
        }
    }

    fn find(&self, selector: &str) -> Node {
        let mut iter = self.root.get_ref().query_selector(selector).unwrap();
        let handle: NodeHandle = iter.next().unwrap();
        self.root.get_ref().get(parser, index)
    }
}
