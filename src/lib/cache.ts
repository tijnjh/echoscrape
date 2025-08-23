import { consola } from 'consola'
import { Effect } from 'effect/index'

export class Cache {
  private cache: Record<string, any> = {}

  tryCache = <T>(key: string, effect: Effect.Effect<T, Error>) => Effect.gen(this, function* () {
    const cached = this.get<T>(key)

    if (!cached) {
      const val = yield* effect.pipe(Effect.mapError(
        error => `got error while trying to run thunk for key: '${key}': ${error.message}`,
      ))
      this.set(key, val)
      return val
    }

    return cached
  })

  private get<T = any>(key: string): T | null {
    const item = this.cache[key]

    if (!item) {
      consola.fail(`(cache) cache miss for '${key}'...`)
      return null
    }

    consola.success(`(cache) cache hit for '${key}'. returning cached data.`)
    return item
  }

  private set(key: string, val: any) {
    this.cache[key] = val
    consola.success(`(cache) data cached for '${key}'.`)
  }
}
