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

app.get("/*", async ({ path, status, request, redirect }) => {
  if (path.startsWith("/")) {
    path = path.replace("/", "");
  }

  const faviconOnly = new URL(request.url).searchParams.has("favicon");

  logger.request(path);

  const scraper = new Scraper();
  const scraperInit = await tryCatch(scraper.init(path));

  if (scraperInit.error) {
    logger.error(scraperInit.error.message);
    status(400);
    return { error: scraperInit.error.message };
  }

  const assetScrape = await tryCatch(
    Promise.all([
      scraper.getFavicon(),
      !faviconOnly ? scraper.getOembed() : null,
    ]),
  );

  if (assetScrape.error) {
    logger.error(assetScrape.error.message);
    status(400);
    return { error: assetScrape.error.message };
  }

  const [favicon, oembed] = assetScrape.data;

  if (faviconOnly && favicon) {
    return redirect(favicon);
  }

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
