import type { Result } from 'neverthrow'
import { consola } from 'consola'
import { JSDOM } from 'jsdom'
import { err, ok } from 'neverthrow'
import { ofetch } from 'ofetch'

function validateUrl(rawUrl: string): Result<URL, Error> {
  if (rawUrl.endsWith('/')) {
    rawUrl = rawUrl.slice(0, -1)
  }

  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = `http://${rawUrl}`
  }

  const parsedUrl = new URL(rawUrl)

  if (['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)) {
    return err(new Error('Access to localhost not allowed'))
  }

  return ok(parsedUrl)
}

export class Scraper {
  #url: URL
  #root?: Document

  constructor(url: string) {
    const validUrl = validateUrl(url)

    if (validUrl.isErr()) {
      throw validUrl.error
    }

    this.#url = validUrl.value
  }

  async init() {
    const html = await fetch(this.#url).then(res => res.text())
    const dom = new JSDOM(html)
    this.#root = dom.window.document
  }

  find(selector: string): Result<Element, Error> {
    const element = this.#root?.querySelector(selector)

    if (!element) {
      consola.fail(`No elements found for selector ${selector}`)
      return err(new Error('failed to find element'))
    }

    consola.success(`Found element for selector ${selector}`)

    return ok(element)
  }

  async getFavicon(): Promise<Result<string, Error>> {
    const linkElement = this.find('link[rel="icon"]')
      .orElse(() => this.find('link[rel="shortcut icon"]'))
      .orElse(() => this.find('link[rel="apple-touch-icon"]'))

    if (linkElement.isErr()) {
      return err(linkElement.error)
    }

    const faviconUrl = linkElement.value.getAttribute('href')

    if (!faviconUrl) {
      const faviconIcoUrl = `${this.#url.toString()}/favicon.ico`

      try {
        await ofetch(faviconIcoUrl, { method: 'head' })
      }
      catch {
        consola.fail('no favicon found')
        return err(new Error('no favicon found'))
      }

      consola.success('/favicon.ico exists')
      return ok(faviconIcoUrl)
    }

    consola.success(`Favicon found in HTML → ${faviconUrl}`)

    if (faviconUrl.startsWith('/')) {
      return ok(`${this.#url.toString()}${faviconUrl.slice(1)}`)
    }

    return ok(faviconUrl)
  }

  async getOembed(): Promise<Result<Record<string, any>, Error>> {
    const oembedTagElement = this.find('link[type="application/json+oembed"]')

    if (oembedTagElement.isErr()) {
      consola.info('website doesnt seem to have oembed, skipping...')
      return err(new Error('no oembed link tag found'))
    }

    consola.success('detected oembed')

    const oembedUrl = oembedTagElement.value.getAttribute('href')

    if (!oembedUrl) {
      return err(new Error('oembed link tag lacks href attribute'))
    }

    const res = await ofetch(oembedUrl)
    return ok(res)
  }
}
