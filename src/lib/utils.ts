import type { YieldWrap } from 'effect/Utils'
import { Effect } from 'effect'

export function orUndefined<T extends object>(obj: T | null | undefined): T | undefined {
  if (!obj)
    return undefined

  if (Object.values(obj).every(v => !v))
    return undefined

  return obj
}

export const generatorToPromise = <Eff extends Generator<YieldWrap<Effect.Effect<any, any, never>>>>(body: () => Eff) => Effect.runPromise(Effect.gen(body)).catch(error => ({ error }))
