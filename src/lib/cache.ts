import { consola } from 'consola'

export class Cache {
  #cache: Record<string, any> = {}

  async tryCache<T>(key: string, getter: () => Promise<T>) {
    const cached = this.#get<T>(key)

    if (!cached) {
      const val = await getter()
      this.#set(key, val)
      return val as T
    }

    return cached
  }

  #get<T = any>(key: string) {
    const item = this.#cache[key]

    if (!item) {
      consola.fail(`(cache) Cache miss for '${key}'...`)
      return null
    }

    consola.success(`(cache) Cache hit for '${key}'. Returning cached data.`)
    return item as T
  }

  #set(key: string, val: any) {
    this.#cache[key] = val
    consola.success(`(cache) Data cached for '${key}'.`)
  }
}
