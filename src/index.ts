import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import { tryCatch } from "typecatch";
import { logger } from "./logger";
import { Scraper } from "./scraper";

const app = new Elysia();

app.use(cors());

app.get("/", ({ request }) => ({
  instruction: `Go to ${request.url}{your-url}`,
  echoscrape: {
    source: "https://github.com/tijnjh/echoscrape",
  },
}));

app.get("/*", async ({ path, status }) => {
  if (path.startsWith("/")) {
    path = path.replace("/", "");
  }

  logger.request(path);

  const scraper = new Scraper();
  const { error } = await tryCatch(scraper.init(path));

  if (error) {
    logger.error(error.message);
    status(400);
    return { error: error.message };
  }

  const { data: scrapedAssets, error: scrapingError } = await tryCatch(
    Promise.all([
      scraper.getFavicon(),
      scraper.getOembed(),
    ]),
  );

  if (scrapingError) {
    logger.error(scrapingError.message);
    status(400);
    return { error: scrapingError.message };
  }

  const [favicon, oembed] = scrapedAssets;

  try {
    const metadata = {
      title: scraper.$("title")?.textContent,
      description: scraper.getMeta("description"),
      favicon,
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
      oembed,
    };

    logger.response("Responding with metadata");

    return metadata;
  } catch (error) {
    logger.error(
      error instanceof Error ? error.stack ?? error.message : String(error),
    );
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

app.listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
