export function undefinedOnEmpty<O extends object>(o: O) {
  for (const i in o) {
    if (Object.prototype.hasOwnProperty.call(o, i)) {
      return o;
    }
  }
}
