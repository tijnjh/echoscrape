import { consola } from 'consola'
import { Effect, Schema } from 'effect'
import { JSDOM } from 'jsdom'

const validateUrl = (rawUrl: string) => Effect.gen(function* () {
  if (rawUrl.endsWith('/')) {
    rawUrl = rawUrl.slice(0, -1)
  }

  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = `http://${rawUrl}`
  }

  const parsedUrl = new URL(rawUrl)

  if (['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)) {
    return yield* Effect.fail(new Error('blocked access to localhost'))
  }

  return parsedUrl
})

export class Scraper {
  private url: URL
  private document?: Document

  constructor(url: string) {
    this.url = Effect.runSync(validateUrl(url))
  }

  initializeDocument = Effect.gen(this, function* () {
    const html = yield* Effect.tryPromise({
      try: () => fetch(this.url).then(r => r.text()),
      catch: (error) => {
        consola.error(error)
        return new Error(`failed to fetch ${this.url}: ${error}`)
      },
    })

    const dom = new JSDOM(html)
    this.document = dom.window.document
  })

  find = (selector: string) => Effect.gen(this, function* () {
    if (!this.document) {
      return yield* Effect.fail(new Error('this.document is undefined, did you forget to call "scraper.initializeDocument"'))
    }

    const element = this.document.querySelector(selector)

    if (!element) {
      consola.fail(`no elements found for selector '${selector}' on '${this.url.hostname}'`)
      return yield* Effect.fail(new Error('failed to find element'))
    }

    consola.success(`found element for selector '${selector}' on '${this.url.hostname}'`)

    return element
  })

  getFavicon = Effect.gen(this, function* () {
    const linkElement = yield* Effect.firstSuccessOf([
      this.find('link[rel="icon"]'),
      this.find('link[rel="shortcut icon"]'),
      this.find('link[rel="apple-touch-icon"]'),
    ])

    const faviconUrl = linkElement.getAttribute('href')

    if (!faviconUrl) {
      const faviconIcoUrl = `${this.url.toString()}/favicon.ico`

      Effect.tryPromise({
        try: () => fetch(faviconIcoUrl, { method: 'HEAD' }),
        catch: () => {
          consola.fail('no favicon found')
          return new Error('no favicon found')
        },
      })

      consola.success('/favicon.ico exists')
      return faviconIcoUrl
    }

    consola.success(`favicon found in HTML → ${faviconUrl}`)

    if (faviconUrl.startsWith('/')) {
      return `${this.url.toString()}${faviconUrl.slice(1)}`
    }

    return faviconUrl
  })

  getOembed = Effect.gen(this, function* () {
    const oembedTagElement = yield* this.find('link[type="application/json+oembed"]').pipe(Effect.orElseFail(() => {
      consola.info('website doesnt seem to have oembed, skipping...')
      return new Error('no oembed link tag found')
    }))

    consola.log(oembedTagElement)

    consola.success('detected oembed')

    const oembedUrl = oembedTagElement.getAttribute('href')

    if (!oembedUrl) {
      return yield* Effect.fail(new Error('oembed link tag lacks href attribute'))
    }

    const res = yield* Effect.tryPromise({
      try: () => fetch(oembedUrl).then(r => r.json()),
      catch: () => new Error('failed to fetch oembed url'),
    })

    const schema = Schema.Record({
      key: Schema.String,
      value: Schema.Any,
    })

    return yield* Schema.decode(schema)(res)
  })
}
