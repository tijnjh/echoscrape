import checkIfLocalhost from "is-localhost-ip";
import parse, { HTMLElement } from "node-html-parser";
import { tryCatch } from "typecatch";
import { tryCache } from "./cache";

export class Scraper {
  root?: HTMLElement;

  async init(url: string) {
    const validUrl = await this.#validateUrl(url);
    const fetched = await tryCatch(
      tryCache(
        validUrl.toString(),
        async () => await fetch(validUrl).then((res) => res.text())
      )
    );

    if (fetched.error) {
      throw new Error(
        `Failed to fetch URL: ${validUrl}, with error ${fetched.error.message}`
      );
    }

    if (typeof fetched.data === "undefined") {
      throw new Error("Data is undefined");
    }

    const parsed = tryCatch(() => parse(fetched.data));

    if (parsed.error) {
      throw new Error(`Failed to parse: ${parsed.error.message}`);
    }

    this.root = parsed.data;
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

  $(selector: string) {
    return this.root?.querySelector(selector);
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
}
