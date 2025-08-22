import { consola } from 'consola'

export class Cache {
  #cache: Record<string, any> = {}

  async tryCache<T>(key: string, thunk: () => Promise<T>) {
    const cached = this.get<T>(key)

    if (!cached) {
      try {
        const val = await thunk()
        this.set(key, val)
        return val
      }
      catch (error) {
        throw new Error(
          `failed to run getter effect for key: '${key}':\n ${JSON.stringify(error, null, 2)}`,
        )
      }
    }

    return cached
  }

  private get<T = any>(key: string) {
    const item = this.#cache[key]

    if (!item) {
      consola.fail(`(cache) Cache miss for '${key}'...`)
      return null
    }

    consola.success(`(cache) Cache hit for '${key}'. Returning cached data.`)
    return item as T
  }

  private set(key: string, val: any) {
    this.#cache[key] = val
    consola.success(`(cache) Data cached for '${key}'.`)
  }
}
