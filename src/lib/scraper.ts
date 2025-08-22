import { consola } from 'consola'
import { Effect } from 'effect'
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
        return new Error(JSON.stringify(error))
      },
    })

    const dom = new JSDOM(html)
    this.document = dom.window.document
  })

  // async initializeDocument() {
  //   try {
  //     const html = await fetch(this.url).then(r => r.text())
  //     const dom = new JSDOM(html)
  //     this.document = dom.window.document
  //   }
  //   catch (error) {
  //     return Effect.fail(new Error(`failed: ${error}`))
  //   }
  // }

  find = (selector: string) => Effect.gen(this, function* () {
    const element = this.document?.querySelector(selector)

    if (!element) {
      consola.fail(`no elements found for selector ${selector}`)
      return yield* Effect.fail(new Error('failed to find element'))
    }

    consola.success(`Found element for selector ${selector}`)

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
          return Effect.fail(new Error('no favicon found'))
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
      return Effect.fail(new Error('no oembed link tag found'))
    }))

    consola.success('detected oembed')

    const oembedUrl = oembedTagElement.getAttribute('href')

    if (!oembedUrl) {
      return yield* Effect.fail(new Error('oembed link tag lacks href attribute'))
    }

    const res = yield* Effect.tryPromise({
      try: () => fetch(oembedUrl).then(r => r.json()),
      catch: () => new Error('failed to fetch oembed url'),
    })

    return res as Record<string, string>
  })
}
