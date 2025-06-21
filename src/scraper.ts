import checkIfLocalhost from "is-localhost-ip";
import parse, { HTMLElement } from "node-html-parser";
import { tryCatch } from "typecatch";
import { tryCache } from "./cache";

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
      throw new Error(`Failed to parse: ${parsed.error.message}`);
    }

    this.#root = parsed.data;
  }

  async #validateUrl(url: string) {
    const { data, error } = tryCatch(() => new URL(url));

    if (error) {
      throw new Error(`Invalid URL: ${error.message}`);
    }

    const isLocalHost = await checkIfLocalhost(data.hostname);

    if (isLocalHost) {
      throw new Error("Access to localhost not allowed");
    }

    return data;
  }

  $<T = HTMLElement>(selector: string) {
    return (this.#root?.querySelector(selector) as T) ?? null;
  }

  getMeta(name: string) {
    return this.$(`meta[name=${name}]`)?.getAttribute("content");
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
      oembed = await fetch(oembedUrl).then((res) => res.json());
    }

    return oembed;
  }

  async getFavicon() {
    let favicon = this.$('link[rel="icon"]')?.getAttribute("href") ||
      this.$('link[rel="shortcut icon"]')?.getAttribute("href") ||
      this.$('link[rel="apple-touch-icon"]')?.getAttribute("href");

    if (favicon) {
      favicon = new URL(favicon, this.#url?.href).href;
      console.log("Favicon found in HTML:", favicon);
    } else {
      const faviconUrl = new URL("/favicon.ico", this.#url?.href).href;
      const response = await fetch(faviconUrl, { method: "HEAD" });

      if (response.ok) {
        favicon = faviconUrl;
        console.log("Fetched /favicon.ico");
      } else {
        console.log("No favicon found.");
      }
    }

    return favicon;
  }
}
