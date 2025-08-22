export function orUndefined<T extends object>(obj: T | null | undefined): T | undefined {
  if (!obj)
    return undefined

  if (Object.values(obj).every(v => !v))
    return undefined

  return obj
}
