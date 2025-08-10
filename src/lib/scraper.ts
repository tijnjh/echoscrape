import { consola } from 'consola'
import { JSDOM } from 'jsdom'
import { t } from 'try'

function validateUrl(rawUrl: string) {
  if (rawUrl.endsWith('/')) {
    rawUrl = rawUrl.slice(0, -1)
  }

  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = `http://${rawUrl}`
  }

  const parsedUrl = new URL(rawUrl)

  if (['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)) {
    throw new Error('Access to localhost not allowed')
  }

  return parsedUrl
}

export class Scraper {
  #url: URL
  #root?: Document

  constructor(url: string) {
    this.#url = validateUrl(url)
  }

  async init() {
    const html = await fetch(this.#url).then(res => res.text())
    const dom = new JSDOM(html)
    this.#root = dom.window.document
  }

  find(selector: string) {
    const element = this.#root?.querySelector(selector)

    if (!element) {
      consola.fail(`No elements found for selector ${selector}`)
      return null
    }

    consola.success(`Found element for selector ${selector}`)

    return element
  }

  async getFavicon() {
    const faviconUrl = this.find('link[rel="icon"]')?.getAttribute('href')
      ?? this.find('link[rel="shortcut icon"]')?.getAttribute('href')
      ?? this.find('link[rel="apple-touch-icon"]')?.getAttribute('href')

    if (!faviconUrl) {
      const faviconIcoUrl = `${this.#url.toString()}/favicon.ico`

      const res = await t(fetch(faviconIcoUrl, { method: 'HEAD' }))

      if (!res.ok) {
        consola.fail('No favicon found')
        return null
      }

      consola.success('/favicon.ico exists')
      return faviconIcoUrl
    }

    consola.success(`Favicon found in HTML → ${faviconUrl}`)

    if (faviconUrl.startsWith('/')) {
      return `${this.#url.toString()}${faviconUrl.slice(1)}`
    }

    return faviconUrl
  }

  async getOembed() {
    const oembedUrl = this.find('link[type="application/json+oembed"]')?.getAttribute('href')

    if (!oembedUrl) {
      consola.info('Website doesn\'t seem to have oEmbed, skipping...')
      return null
    }

    consola.success('Detected oembed')
    return await fetch(oembedUrl).then(res => res.json())
  }
}
