export const logger = {
  request: (msg: string) => console.log(`┌ 📤 ${msg}`),
  cache: (msg: string) => console.log(`│ [cache] ${msg}`),
  validate: (msg: string) => console.log(`│ [validate] ${msg}`),
  parse: (msg: string) => console.log(`│ [parse] ${msg}`),
  meta: (msg: string) => console.log(`│ [meta] ${msg}`),
  oembed: (msg: string) => console.log(`│ [oembed] ${msg}`),
  favicon: (msg: string) => console.log(`│ [favicon] ${msg}`),
  response: (msg: string) => console.log(`└ 📥 ${msg}`),
  warn: (msg: string) => console.warn(`⚠ ${msg}`),
  error: (msg: string) => console.error(`✕ ${msg}`),
};
