import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import { logger } from "./logger";
import { Scraper } from "./scraper";
import { tryCatch } from "typecatch-neverthrow";

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
  const scraperInit = await scraper.init(path);

  if (scraperInit.isErr()) {
    logger.error(scraperInit.error);
    status(400);
    return { error: scraperInit.error };
  }

  const [favicon, oembed] = await Promise.all([
    scraper.getFavicon(),
    !faviconOnly ? scraper.getOembed() : null,
  ]);

  if (faviconOnly && favicon) {
    return redirect(favicon);
  }

  const metadata = tryCatch(() => ({
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
  }));

  if (metadata.isErr()) {
    logger.error(metadata.error.message);
    status(400);
    return { error: metadata.error };
  }

  logger.response("Responding with metadata");

  return metadata.value;
});

app.listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
