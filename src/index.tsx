import { type BunRequest, serve } from "bun";
import { tryCatch } from "typecatch";
import { Scraper } from "./scraper";

serve({
  routes: {
    "/*": async (req: BunRequest) => {
      let path = new URL(req.url).pathname;

      if (path.startsWith("/")) {
        path = path.replace("/", "");
      }

      const scraper = new Scraper();
      const { error } = await tryCatch(scraper.init(path));

      if (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }

      try {
        const res = Response.json({
          title: scraper.$("title")?.textContent,
          description: scraper.getMeta("description"),
          themeColor: scraper.getMeta("theme-color"),
          og: {
            title: scraper.getOg("title"),
            description: scraper.getOg("description"),
            image: scraper.getOg("image"),
            imageAlt: scraper.getOg("image:alt"),
            imageWidth: scraper.getOg("image:width"),
            imageHeight: scraper.getOg("image:height"),
            url: scraper.getOg("url"),
            type: scraper.getOg("type"),
            siteName: scraper.getOg("site_name"),
          },
          twitter: {
            title: scraper.getTwitter("title"),
            description: scraper.getTwitter("description"),
            image: scraper.getTwitter("image"),
            site: scraper.getTwitter("site"),
            card: scraper.getTwitter("card"),
          },
        });
        res.headers.set("Access-Control-Allow-Origin", "*");
        res.headers.set("Access-Control-Allow-Methods", "GET");
        return res;
      } catch (error) {
        return Response.json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    "/": (req) => (
      <html>
        <h1>metascraper</h1>
        go to<br />
        <code style={{ backgroundColor: "#f5f5f5" }}>{req.url}{`{url}`}</code>
      </html>
    ),
  },
});
