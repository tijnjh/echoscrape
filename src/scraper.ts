import checkIfLocalhost from "is-localhost-ip";
import parse, { HTMLElement } from "node-html-parser";
import { tryCatch } from "typecatch-neverthrow";
import { tryCache } from "./cache";
import { logger } from "./logger";
import { err, ok, type Result } from "neverthrow";

export class Scraper {
  #url?: URL;
  #root?: HTMLElement;

  async init(url: string): Promise<Result<void, string>> {
    const validatedUrl = await this.#validateUrl(url);

    if (validatedUrl.isErr()) {
      return err(validatedUrl.error);
    }

    this.#url = validatedUrl.value;

    const pageData = await tryCatch(
      tryCache(
        this.#url.toString(),
        async () => await fetch(this.#url!).then((res) => res.text()),
      ),
    );

    if (pageData.isErr()) {
      return err(
        `Failed to fetch URL: ${this.#url}, with error ${pageData.error.message}`,
      );
    }

    if (typeof pageData.value === "undefined") {
      return err("Data is undefined");
    }

    const parsedPageData = tryCatch(() => parse(pageData.value));

    if (parsedPageData.isErr()) {
      logger.error(
        `Failed to parse HTML for ${this.#url}: ${parsedPageData.error.message}`,
      );
      return err(`Failed to parse: ${parsedPageData.error.message}`);
    }

    logger.parse("Successfully parsed HTML");
    this.#root = parsedPageData.value;

    return ok(undefined);
  }

  async #validateUrl(url: string): Promise<Result<URL, string>> {
    logger.validate("Validating URL...");
    const validatedUrl = tryCatch(() => URL.parse(url));

    if (validatedUrl.isErr()) {
      return err(`Invalid URL: ${validatedUrl.error.message}`);
    }
    if (!validatedUrl.value) {
      return err("Invalid URL");
    }

    const isLocalHost = await checkIfLocalhost(validatedUrl.value.hostname);

    if (isLocalHost) {
      logger.warn("Blocked localhost URL");
      return err("Access to localhost not allowed");
    }

    logger.validate("URL is valid and allowed");
    return ok(validatedUrl.value);
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
