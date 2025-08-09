export function orUndefined<T extends object>(obj: T) {
  if (!obj)
    return undefined

  if (Object.values(obj).filter(v => !!v).length === 0)
    return undefined

  return obj
}
