import { serve, type BunRequest } from "bun";
import { Scraper } from "./scraper";

serve({
  routes: {
    "/*": async (req: BunRequest) => {
      let path = new URL(req.url).pathname;

      if (path.startsWith("/")) {
        path = path.replace("/", "");
      }

      const scraper = new Scraper();
      await scraper.init(path);

      try {
        return Response.json({
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
      } catch (error) {
        return Response.json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },
});
