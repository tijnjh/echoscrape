import SwiftSoup
import Vapor

public class Scraper {
    var url: URL
    var root: Document

    init(url: String) async throws {
        self.url = try Self.validateUrl(rawUrl: url)
        let (data, _) = try await URLSession.shared.data(from: self.url)
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
                print("No elements found for selector \(selector)")
            }

            print("Found element for selector \(selector)")

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
            print("Detected oembed")

            guard let oembedURL = URL(string: oembedUrl!) else {
                return nil
            }

            let (data, _) = try await URLSession.shared.data(from: oembedURL)
            let oembed = try JSONSerialization.jsonObject(with: data) as! [String: String]
            return oembed
        }

        print("Website doesn't seem to have oEmbed, skipping...")
        return nil
    }
}
