import Vapor

struct Metadata: Content {
    let title: String?
    let description: String?
    let favicon: String?
    let themeColor: String?

    let og: Og
    struct Og: Content {
        let title: String?
        let description: String?
        let image: String?
        let imageAlt: String?
        let imageWidth: String?
        let imageHeight: String?
        let url: String?
        let type: String?
        let siteName: String?
    }

    let twitter: Twitter
    struct Twitter: Content {
        let title: String?
        let description: String?
        let image: String?
        let site: String?
        let card: String?
    }

    let oembed: [String: String]?
}

let app = try await Application.make(.detect())

let cors = CORSMiddleware(
    configuration: CORSMiddleware.Configuration(
        allowedOrigin: .all,
        allowedMethods: [.GET, .POST, .PUT, .OPTIONS, .DELETE, .PATCH],
        allowedHeaders: [
            .accept, .authorization, .contentType, .origin, .xRequestedWith, .userAgent,
            .accessControlAllowOrigin,
        ]
    )
)

app.middleware.use(cors, at: .beginning)

let addr =
    "https://\(app.http.server.configuration.hostname):\(String(app.http.server.configuration.port))"

app.get("") { req in
    return [
        "instruction": "Go to \(addr)/example.com",
        "source": "https://github.com/tijnjh/echoscrape",
    ]
}

app.get("**") { req in
    let path = req.url.path.hasPrefix("/") ? String(req.url.path.dropFirst()) : req.url.path
    let scraper = try await Scraper(url: path)

    let favicon = try? await scraper.getFavicon()
    let oembed = try? await scraper.getOembed()

    return Metadata(
        title: scraper.find("title", .text),
        description: scraper.find("meta[name='description']", .attr("content")),
        favicon: favicon,
        themeColor: scraper.find("meta[name='theme-color']", .attr("content")),
        og: Metadata.Og(
            title: scraper.find("meta[property='og:title']", .attr("content")),
            description: scraper.find("meta[property='og:description']", .attr("content")),
            image: scraper.find("meta[property='og:image']", .attr("content")),
            imageAlt: scraper.find("meta[property='og:image:alt']", .attr("content")),
            imageWidth: scraper.find("meta[property='og:image:width']", .attr("content")),
            imageHeight: scraper.find("meta[property='og:image:height']", .attr("content")),
            url: scraper.find("meta[property='og:url']", .attr("content")),
            type: scraper.find("meta[property='og:type']", .attr("content")),
            siteName: scraper.find("meta[property='og:site_name']", .attr("content")),
        ),
        twitter: Metadata.Twitter(
            title: scraper.find("meta[name='twitter:title']", .attr("content")),
            description: scraper.find("meta[name='twitter:description']", .attr("content")),
            image: scraper.find("meta[name='twitter:image']", .attr("content")),
            site: scraper.find("meta[name='twitter:site']", .attr("content")),
            card: scraper.find("meta[name='twitter:card']", .attr("content")),
        ),
        oembed: oembed
    )
}

app.get("favicon.ico") { req -> [String: String] in [:] }

try await app.execute()
