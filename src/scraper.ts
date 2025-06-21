import checkIfLocalhost from "is-localhost-ip";
import parse, { HTMLElement } from "node-html-parser";
import { tryCatch } from "typecatch";
import { tryCache } from "./cache";
import { logger } from "./logger";

export class Scraper {
  #url?: URL;
  #root?: HTMLElement;

  async init(url: string) {
    this.#url = await this.#validateUrl(url);
    const fetched = await tryCatch(
      tryCache(
        this.#url.toString(),
        async () => await fetch(this.#url!).then((res) => res.text()),
      ),
    );

    if (fetched.error) {
      throw new Error(
        `Failed to fetch URL: ${this.#url}, with error ${fetched.error.message}`,
      );
    }

    if (typeof fetched.data === "undefined") {
      throw new Error("Data is undefined");
    }

    const parsed = tryCatch(() => parse(fetched.data));

    if (parsed.error) {
      logger.error(
        `Failed to parse HTML for ${this.#url}: ${parsed.error.message}`,
      );
      throw new Error(`Failed to parse: ${parsed.error.message}`);
    }

    logger.parse("Successfully parsed HTML");
    this.#root = parsed.data;
  }

  async #validateUrl(url: string) {
    logger.validate("Validating URL...");
    const { data, error } = tryCatch(() => new URL(url));

    if (error) {
      throw new Error(`Invalid URL: ${error.message}`);
    }

    const isLocalHost = await checkIfLocalhost(data.hostname);

    if (isLocalHost) {
      logger.warn("Blocked localhost URL");
      throw new Error("Access to localhost not allowed");
    }

    logger.validate("URL is valid and allowed");
    return data;
  }

  $<T = HTMLElement>(selector: string) {
    return (this.#root?.querySelector(selector) as T) ?? null;
  }

  getMeta(name: string) {
    const value = this.$(`meta[name=${name}]`)?.getAttribute("content");
    if (value) {
      logger.meta(`meta[name=${name}] = ${value}`);
    }
    return value;
  }

  getOg(property: string) {
    return this.$(`meta[property=og:${property}]`)?.getAttribute("content");
  }

  getTwitter(name: string) {
    return this.getMeta(`twitter:${name}`);
  }

  async getOembed() {
    let oembed = {};

    const oembedUrl = this.$<HTMLLinkElement>(
      'link[rel="alternate"][type="application/json+oembed"]',
    )?.getAttribute("href");

    if (oembedUrl) {
      logger.oembed(`Detected oembed`);
      oembed = await fetch(oembedUrl).then((res) => res.json());
    } else {
      logger.oembed("Website doesn't seem to have oembed...");
    }

    return oembed;
  }

  async getFavicon() {
    let favicon = this.$('link[rel="icon"]')?.getAttribute("href") ||
      this.$('link[rel="shortcut icon"]')?.getAttribute("href") ||
      this.$('link[rel="apple-touch-icon"]')?.getAttribute("href");

    if (favicon) {
      favicon = new URL(favicon, this.#url?.href).href;
      logger.favicon(`Favicon found in HTML: ${favicon}`);
    } else {
      const faviconUrl = new URL("/favicon.ico", this.#url?.href).href;
      const response = await fetch(faviconUrl, { method: "HEAD" });

      if (response.ok) {
        favicon = faviconUrl;
        logger.favicon("Fetched /favicon.ico");
      } else {
        logger.favicon("No favicon found.");
      }
    }

    return favicon;
  }
}
