import consola from 'consola'
import { Effect } from 'effect'

const cache: Record<string, any> = {}

export function tryCache<A, E, R>(key: string, fn: () => Effect.Effect<A, E, R>) {
  return Effect.gen(function* () {
    if (typeof cache[key] === 'undefined') {
      consola.info('Cache miss. Fetching data...')
      const data = yield* fn()
      cache[key] = data
      consola.info('Data cached')
      return data
    }
    else {
      consola.info(`Cache hit. Returning cached data.`)
      return cache[key] as A
    }
  })
}

export function objectOrUndefined<T extends object>(obj: T) {
  return Object.values(obj).filter(value => value !== undefined).length === 0 ? undefined : obj
}
