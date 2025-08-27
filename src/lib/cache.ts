import { consola } from 'consola'
import { Effect } from 'effect/index'

interface CacheResult<T> {
  value: T
  cachedAt: number | null
}

export class Cache {
  private cache: Record<string, CacheResult<any>> = {}
  _stats = {
    cacheAge: Date.now(),
  }

  tryCache = <T>(key: string, effect: Effect.Effect<T, Error>) => Effect.gen(this, function* () {
    const cached = this.get<T>(key)

    if (!cached?.value) {
      const val = yield* effect.pipe(Effect.mapError(
        error => `got error while trying to run thunk for key: '${key}': ${error.message}`,
      ))
      this.set(key, val)
      return { value: val, cachedAt: null } as CacheResult<T>
    }

    return { ...cached } as CacheResult<T>
  })

  private get<T = any>(key: string) {
    const item = this.cache[key]

    if (!item) {
      consola.fail(`(cache) cache miss for '${key}'...`)
      return null
    }

    consola.success(`(cache) cache hit for '${key}'. returning cached data.`)
    return item as { value: T, cachedAt: number | null }
  }

  private set(key: string, val: any) {
    this.cache[key] = {
      value: val,
      cachedAt: Date.now(),
    }
    consola.success(`(cache) data cached for '${key}'.`)
  }
}
