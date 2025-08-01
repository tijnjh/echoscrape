import Vapor

struct Metadata: Content {
    let title: String?
    let description: String?
    let favicon: String?
    let themeColor: String?
    let og: Og
    let twitter: Twitter
    let oembed: [String: String]?

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

    struct Twitter: Content {
        let title: String?
        let description: String?
        let image: String?
        let site: String?
        let card: String?
    }
}
