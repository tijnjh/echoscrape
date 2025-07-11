import type { HTMLElement } from 'node-html-parser'
import { HttpClient } from '@effect/platform'
import consola from 'consola'
import { Data, Effect } from 'effect'
import checkIfLocalhost from 'is-localhost-ip'
import isValidDomain from 'is-valid-domain'
import parse from 'node-html-parser'

export class InvalidUrlError extends Data.TaggedError('InvalidUrlError')<{
  message: string
}> {}
export class FetchError extends Data.TaggedError('FetchError')<{
  message: string
}> {}
export class ParseError extends Data.TaggedError('ParseError')<{
  message: string
}> {}
export class LocalhostError extends Data.TaggedError('LocalhostError')<{
  message: string
}> {}

export class Scraper {
  #url?: URL
  #root?: HTMLElement

  init = (url: string) => Effect.gen(this, function* () {
    this.#url = yield* this.#validateUrl(url)

    this.#root = yield* HttpClient.get(this.#url!).pipe(
      Effect.andThen(response => response.text),
      Effect.andThen(text => Effect.try({
        try: () => parse(text),
        catch: error => new ParseError({ message: `failed to parse HTML: ${error}` }),
      })),
    )
  })

  #validateUrl = (url: string) => Effect.gen(this, function* () {
    if (!(url.startsWith('http://') || url.startsWith('https://'))) {
      url = `http://${url}`
      consola.info(`URL did not start with http(s)://, rewriting to ${url}...`)
    }

    const validatedUrl = yield* Effect.try({
      try: () => {
        const parsedUrl = new URL(url)

        if (!isValidDomain(parsedUrl.hostname)) {
          throw new InvalidUrlError({ message: `Invalid URL: '${url}' is not a valid URL` })
        }

        consola.success('URL is valid')

        return new URL(url)
      },
      catch: (error) => {
        const err = new InvalidUrlError(error as Error)
        consola.fail(err)
        return err
      },
    })

    const isLocalHost = yield* Effect.tryPromise({
      try: () => checkIfLocalhost(validatedUrl.hostname),
      catch: error => new LocalhostError({ message: `Failed to check localhost: ${(error as Error).message}` }),
    })

    if (isLocalHost) {
      const err = new LocalhostError({ message: 'Access to localhost is not allowed' })
      consola.error(err)
      yield* Effect.fail(err)
    }

    consola.success('URL is allowed')
    return validatedUrl
  })

  $ = <T = HTMLElement>(selector: string) => Effect.gen(this, function* () {
    const element = this.#root?.querySelector(selector)
    if (!element) {
      consola.fail(`${selector}: No element found`)
      return undefined
    }

    consola.success(`${selector}: Found element → ${element.tagName}`)

    return element as T
  })

  getMeta = (name: string) => Effect.gen(this, function* () {
    return (yield* this.$(`meta[name=${name}]`))?.getAttribute('content')
  })

  getOg = (property: string) => Effect.gen(this, function* () {
    const el = yield* this.$(`meta[property=og:${property}]`)
    return el?.getAttribute('content')
  })

  getTwitter = (name: string) => this.getMeta(`twitter:${name}`)

  getOembed = () => Effect.gen(this, function* () {
    const oembedUrl = (yield* this.$<HTMLLinkElement>('link[rel="alternate"][type="application/json+oembed"]'))?.getAttribute('href')

    if (oembedUrl) {
      consola.info('Detected oembed')

      const oembed = yield* Effect.tryPromise({
        try: () => fetch(oembedUrl).then(res => res.json()),
        catch: error => new FetchError({ message: `Failed to fetch oembed: ${(error as Error).message}` }),
      })

      return oembed as Record<string, unknown>
    }
    else {
      consola.fail('Website doesn\'t seem to have oEmbed, skipping...')
      return {}
    }
  })

  getFavicon = () => Effect.gen(this, function* () {
    let favicon = (yield* this.$('link[rel="icon"]'))?.getAttribute('href')
      || (yield* this.$('link[rel="shortcut icon"]'))?.getAttribute('href')
      || (yield* this.$('link[rel="apple-touch-icon"]'))?.getAttribute('href')

    if (favicon) {
      favicon = new URL(favicon, this.#url?.href)?.href
      consola.success(`Favicon found in HTML → ${favicon}`)
      return favicon
    }
    else {
      const faviconUrl = new URL('/favicon.ico', this.#url?.href).href
      const response = yield* Effect.tryPromise({
        try: () => fetch(faviconUrl, { method: 'HEAD' }),
        catch: error => new FetchError({ message: `Failed to check favicon: ${(error as Error).message}` }),
      })

      if (response.ok) {
        consola.success('Fetched /favicon.ico')
        return faviconUrl
      }
      else {
        consola.info('No favicon found.')
        return undefined
      }
    }
  })
}
