import { logger } from "./logger";

const cache: Record<string, any> = {};

export async function tryCache<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (typeof cache[key] === "undefined") {
    logger.cache("Cache miss. Fetching data...");
    const data = await fn();
    cache[key] = data;
    logger.cache("Data cached");
    return data;
  } else {
    logger.cache(`Cache hit. Returning cached data.`);
    return cache[key] as T;
  }
}
