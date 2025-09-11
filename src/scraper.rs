use std::{any::Any, error::Error, fs::exists, str::FromStr};

use actix_web::http::Uri;
use regex::Regex;

use reqwest::blocking::get;
use tl::VDom;

fn validate_url(mut raw_url: String) -> Result<Uri, Box<dyn std::error::Error>> {
    if raw_url.starts_with("/") {
        raw_url = raw_url[..raw_url.len() - 1].to_owned();
    }

    let re = Regex::new(r"(?i)^https?://")?;

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

struct Scraper {
    url: Uri,
    // root: ,
}

impl Scraper {
    fn init(url: String) -> Result<Scraper, Box<dyn std::error::Error>> {
        let valid_url = validate_url(url)?;
        let html = get(valid_url.to_string())?.text()?;
        let dom = tl::parse(&html, tl::ParserOptions::default());

        Ok(Self {
            url: valid_url,
            root: dom,
        })
    }

    fn find(&self, selector_str: &str) -> Result<Html, Box<dyn std::error::Error>> {
        let selector = Selector::parse(selector_str)?;
        let element = self.root.select(&selector);

        Ok(element.take(0).un)
    }
}
