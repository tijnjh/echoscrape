import SwiftSoup
import Vapor

class Scraper {
    var url: URL
    var root: Document

    init(url: String) async throws {
        let validUrl = try Self.validateUrl(rawUrl: url)
        self.url = validUrl
        let (data, _) = try await cache.tryCache(key: url) {
            try await URLSession.shared.data(from: validUrl)
        }
        self.root = try SwiftSoup.parse(String(data: data, encoding: .utf8)!)
    }

    enum URLParsingError: Error {
        case invalidURL
        case localhostNotAllowed
    }

    private static func validateUrl(rawUrl: String) throws -> URL {
        guard var urlComponents = URLComponents(string: rawUrl) else {
            throw URLParsingError.invalidURL
        }

        if urlComponents.scheme == nil {
            urlComponents.scheme = "http"
        }

        guard let parsedURL = urlComponents.url else {
            throw URLParsingError.invalidURL
        }

        if let host = urlComponents.host {
            if host == "localhost" || host == "127.0.0.1" || host == "::1" {
                throw URLParsingError.localhostNotAllowed
            }
        }

        return parsedURL
    }

    enum FindOption {
        case text
        case attr(String)
    }

    enum ElementFindingError: Error {
        case notFound
    }

    func find(_ selector: String, _ get: FindOption) -> String? {
        do {
            let elements = try root.select(selector)

            if elements.isEmpty() {
                Logger.fail("No elements found for selector '\(selector)'")
                return nil
            }

            Logger.success("Found element for selector '\(selector)'")

            let element = elements.first()

            switch get {
            case .text: return try element?.text()
            case .attr(let attr): return try element?.attr(attr)
            }
        } catch {
            return nil
        }

    }

    func getOembed() async throws -> [String: String]? {
        let oembedUrl = find("link[rel='alternate'][type='application/json+oembed']", .attr("href"))

        if oembedUrl != nil {
            Logger.success("Detected oembed")

            guard let oembedURL = URL(string: oembedUrl!) else {
                return nil
            }

            let (data, _) = try await cache.tryCache(key: "\(self.url)-oembed") {
                try await URLSession.shared.data(from: oembedURL)
            }

            let oembed = try JSONSerialization.jsonObject(with: data) as! [String: String]
            return oembed
        }

        Logger.info("Website doesn't seem to have oEmbed, skipping...")
        return nil
    }

    func getFavicon() async throws -> String? {
        guard
            let favicon =
                self.find("link[rel='icon']", .attr("href"))
                ?? self.find("link[rel='shortcut icon']", .attr("href"))
                ?? self.find("link[rel='apple-touch-icon']", .attr("href"))
        else {
            let faviconUrl = "\(self.url)/favicon.ico"

            var request = URLRequest(url: URL(string: faviconUrl)!)

            request.httpMethod = "HEAD"

            let (_, response) = try await cache.tryCache(key: "\(self.url)-favicon") {
                try await URLSession.shared.data(for: request)
            }
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200
            else {
                Logger.fail("No favicon found.")
                return nil
            }

            Logger.success("Fetched /favicon.ico")

            return faviconUrl
        }

        Logger.success("Favicon found in HTML → \(favicon)")
        return favicon
    }
}
