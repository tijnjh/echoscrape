export function undefinedOnEmpty<O extends object>(o: O) {
  if (!o) return

  if (Object.values(o).filter(Boolean).length) {
    return o
  }
}