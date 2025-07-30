import Vapor

struct ES_Reponse: Content {
    var title: String?
    var description: String?
    var themeColor: String?
    var og: ES_Og
    var twitter: ES_Twitter
    var oembed: [String: String]?
}

struct ES_Og: Content {
    var title: String?
    var description: String?
    var image: String?
    var imageAlt: String?
    var imageWidth: String?
    var imageHeight: String?
    var url: String?
    var type: String?
    var siteName: String?
}

struct ES_Twitter: Content {
    var title: String?
    var description: String?
    var image: String?
    var site: String?
    var card: String?
}

@main
class Echoscrape {
    static func main() async throws {
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

            let oembed = try? await scraper.getOembed()

            return ES_Reponse(
                title: scraper.find("title", .text),
                description: scraper.find("meta[name='description']", .attr("content")),
                themeColor: scraper.find("meta[name='theme-color']", .attr("content")),
                og: ES_Og(
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
                twitter: ES_Twitter(
                    title: scraper.find("meta[name='twitter:title']", .attr("content")),
                    description: scraper.find("meta[name='twitter:description']", .attr("content")),
                    image: scraper.find("meta[name='twitter:image']", .attr("content")),
                    site: scraper.find("meta[name='twitter:site']", .attr("content")),
                    card: scraper.find("meta[name='twitter:card']", .attr("content")),
                ),
                oembed: oembed
            )

        }

        try await app.execute()
    }
}
