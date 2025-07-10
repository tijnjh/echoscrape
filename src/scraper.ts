import type { HTMLElement } from 'node-html-parser'
import type { CacheService } from './cache'
import { Effect } from 'effect'
import checkIfLocalhost from 'is-localhost-ip'
import parse from 'node-html-parser'
import { tryCache } from './cache'
import { FetchError, InvalidUrlError, LocalhostError, ParseError } from './errors'

export class Scraper {
  #url?: URL
  #root?: HTMLElement

  init = (url: string): Effect.Effect<void, InvalidUrlError | LocalhostError | FetchError | ParseError, CacheService> => Effect.gen(this, function* () {
    const validatedUrl = yield* this.#validateUrl(url)
    this.#url = validatedUrl

    const pageData = yield* tryCache(this.#url.toString(), () =>
      Effect.tryPromise({
        try: () => fetch(this.#url!).then(res => res.text()),
        catch: error => new FetchError(`Failed to fetch URL: ${this.#url}, with error ${(error as Error).message}`),
      }))

    const parsedPageData = yield* Effect.try({
      try: () => parse(pageData),
      catch: error => new ParseError(`Failed to parse: ${(error as Error).message}`),
    })

    yield* Effect.logInfo('Successfully parsed HTML')
    this.#root = parsedPageData
  })

  #validateUrl = (url: string): Effect.Effect<URL, InvalidUrlError | LocalhostError> => Effect.gen(this, function* () {
    yield* Effect.logInfo('Validating URL...')

    const validatedUrl = yield* Effect.try({
      try: () => {
        const parsed = new URL(url)
        if (!parsed)
          throw new Error('Invalid URL')
        return parsed
      },
      catch: error => new InvalidUrlError(`Invalid URL: ${(error as Error).message}`),
    })

    const isLocalHost = yield* Effect.tryPromise({
      try: () => checkIfLocalhost(validatedUrl.hostname),
      catch: error => new LocalhostError(`Failed to check localhost: ${(error as Error).message}`),
    })

    if (isLocalHost) {
      yield* Effect.logError('Blocked localhost URL')
      yield* Effect.fail(
        new LocalhostError('Access to localhost not allowed'),
      )
    }

    yield* Effect.logInfo('URL is valid and allowed')
    return validatedUrl
  })

  $ = <T = HTMLElement>(selector: string): Effect.Effect<T | null> => Effect.gen(this, function* () {
    return this.#root?.querySelector(selector) as T
  })

  getMeta = (name: string): Effect.Effect<string | undefined, Error> => Effect.gen(this, function* () {
    const value = (yield* this.$(`meta[name=${name}]`))?.getAttribute('content')

    if (value) {
      yield* Effect.logInfo(`meta[name=${name}] = ${value}`)
    }

    return value
  })

  getOg = (property: string): Effect.Effect<string | undefined, Error> => Effect.gen(this, function* () {
    const el = yield* this.$(`meta[property=og:${property}]`)
    return el?.getAttribute('content')
  })

  getTwitter = (name: string): Effect.Effect<string | undefined, Error> => this.getMeta(`twitter:${name}`)

  getOembed = (): Effect.Effect<Record<string, unknown>, FetchError | Error> => Effect.gen(this, function* () {
    const oembedUrl = (yield* this.$<HTMLLinkElement>('link[rel="alternate"][type="application/json+oembed"]'))?.getAttribute('href')

    if (oembedUrl) {
      yield* Effect.logInfo('Detected oembed')

      const oembed = yield* Effect.tryPromise({
        try: () => fetch(oembedUrl).then(res => res.json()),
        catch: error => new FetchError(`Failed to fetch oembed: ${(error as Error).message}`),
      })

      return oembed as Record<string, unknown>
    }
    else {
      yield* Effect.logInfo('Website doesn\'t seem to have oembed...')
      return {}
    }
  })

  getFavicon = (): Effect.Effect<string | undefined, FetchError | Error> => Effect.gen(this, function* () {
    let favicon
      = (yield* this.$('link[rel="icon"]'))?.getAttribute('href')
        || (yield* this.$('link[rel="shortcut icon"]'))?.getAttribute('href')
        || (yield* this.$('link[rel="apple-touch-icon"]'))?.getAttribute('href')

    if (favicon) {
      favicon = new URL(favicon, this.#url?.href)?.href
      yield* Effect.logInfo(`Favicon found in HTML: ${favicon}`)
      return favicon
    }
    else {
      const faviconUrl = new URL('/favicon.ico', this.#url?.href).href
      const response = yield* Effect.tryPromise({
        try: () => fetch(faviconUrl, { method: 'HEAD' }),
        catch: error => new FetchError(`Failed to check favicon: ${(error as Error).message}`),
      })

      if (response.ok) {
        yield* Effect.logInfo('Fetched /favicon.ico')
        return faviconUrl
      }
      else {
        yield* Effect.logInfo('No favicon found.')
        return undefined
      }
    }
  })
}
