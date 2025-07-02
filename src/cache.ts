import { Context, Effect, Layer } from "effect";

export interface CacheService {
  readonly get: <T>(key: string) => Effect.Effect<T | undefined>;
  readonly set: <T>(key: string, value: T) => Effect.Effect<void>;
  readonly has: (key: string) => Effect.Effect<boolean>;
}

export const CacheService = Context.GenericTag<CacheService>("CacheService");

export const makeInMemoryCache = (): CacheService => {
  const cache = new Map<string, unknown>();

  return {
    get: <T>(key: string) =>
      Effect.gen(function* () {
        const value = cache.get(key) as T | undefined;
        if (value !== undefined) {
          yield* Effect.logInfo("Cache hit. Returning cached data.");
        }
        return value;
      }),

    set: <T>(key: string, value: T) =>
      Effect.gen(function* () {
        cache.set(key, value);
        yield* Effect.logInfo("Data cached");
      }),

    has: (key: string) => Effect.succeed(cache.has(key)),
  };
};

export const InMemoryCacheLayer = Layer.succeed(
  CacheService,
  makeInMemoryCache()
);

export const tryCache = <T, E, R>(
  key: string,
  fn: () => Effect.Effect<T, E, R>
): Effect.Effect<T, E, R | CacheService> =>
  Effect.gen(function* () {
    const cache = yield* CacheService;

    const cached = yield* cache.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    yield* Effect.logInfo("Cache miss. Fetching data...");
    const data = yield* fn();
    yield* cache.set(key, data);

    return data;
  });
