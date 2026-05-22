import type { Metadata } from "#lib/types.ts";

import { Scraper } from "#lib/scraper.ts";
import { undefinedOnEmpty } from "#lib/utils.ts";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import pkg from "../package.json" with { type: "json" };

const app = new Hono().use(cors());

app.get("/", (c) => {
  const url = new URL(c.req.url);

  const addr = `${url.protocol}//${url.host}`;

  return c.json({
    name: "echoscrape",
    about: "minimal api for scraping metadata, favicon, and text from public sites",
    repo: "https://github.com/tijnjh/echoscrape",
    license: pkg.license,
    endpoints: {
      metadata: {
        GET: `/metadata/{host}`,
        note: "returns site metadata (title, description, og, twitter, oembed, etc)",
        example: `${addr}/metadata/react.dev`,
      },
      favicon: {
        GET: `/favicon/{host}`,
        note: "redirects to site favicon if found",
        example: `${addr}/favicon/vite.dev`,
      },
      text: {
        GET: `/text/{host}?selector={css_selector}`,
        note: "returns textContent of first matching element",
        example: `${addr}/text/bun.com?selector=h1`,
      },
    },
  });
});

app.get("/metadata/:path{.+}", async (c) => {
  const scraper = await Scraper.init(c.req.param("path"));

  const [favicon, oembed] = await Promise.all([scraper.getFavicon(), scraper.getOembed()]);

  function getContentAttr(name: string) {
    return scraper.find(name)?.getAttribute("content") ?? undefined;
  }

  return c.json({
    title: scraper.find("title")?.textContent,
    description: getContentAttr('meta[name="description"]'),
    favicon,
    theme_color: getContentAttr('meta[name="theme-color"]'),
    og: undefinedOnEmpty({
      title: getContentAttr('meta[property="og:title"]'),
      description: getContentAttr('meta[property="og:description"]'),
      image: getContentAttr('meta[property="og:image"]'),
      image_alt: getContentAttr('meta[property="og:image:alt"]'),
      image_width: getContentAttr('meta[property="og:image:width"]'),
      image_height: getContentAttr('meta[property="og:image:height"]'),
      url: getContentAttr('meta[property="og:url"]'),
      type: getContentAttr('meta[property="og:type"]'),
      site_name: getContentAttr('meta[property="og:site_name"]'),
    }),
    twitter: undefinedOnEmpty({
      title: getContentAttr('meta[name="twitter:title"]'),
      description: getContentAttr('meta[name="twitter:description"]'),
      image: getContentAttr('meta[name="twitter:image"]'),
      site: getContentAttr('meta[name="twitter:site"]'),
      card: getContentAttr('meta[name="twitter:card"]'),
    }),
    oembed: undefinedOnEmpty(oembed),
  } satisfies Metadata);
});

app.get("/favicon/:path{.+}", async (c) => {
  const url = c.req.param("path");
  const scraper = await Scraper.init(url);
  const favicon = await scraper.getFavicon();
  return favicon ? c.redirect(favicon) : c.json("no favicon found");
});

app.get("/text/:path{.+}", async (c) => {
  const url = c.req.param("path");
  const scraper = await Scraper.init(url);
  const text = scraper.find(c.req.query("selector")!)?.textContent;
  return c.json(text);
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`꩜ Echoscrape is running at http://localhost:${info.port}`);
  },
);
