const cache: Record<string, any> = {};

export async function tryCache<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (typeof cache[key] === "undefined") {
    console.log(`🤔 Cache miss for key: ${key}. Fetching data...`);
    const data = await fn();
    cache[key] = data;
    console.log(`✅ Data cached for key: ${key}`);
    return data;
  } else {
    console.log(`😎 Cache hit for key: ${key}. Returning cached data.`);
    return cache[key] as T;
  }
}
