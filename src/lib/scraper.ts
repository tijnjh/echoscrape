import { consola } from 'consola'
import domino from 'domino'

function validateUrl(rawUrl: string) {
  if (rawUrl.endsWith('/')) {
    rawUrl = rawUrl.slice(0, -1)
  }

  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = `http://${rawUrl}`
  }

  const parsedUrl = new URL(rawUrl)

  if (['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)) {
    throw new Error('access to localhost not allowed')
  }

  return parsedUrl
}

export class Scraper {
  private url!: URL
  private root?: Document

  private constructor() {}

  static async init(url: string) {
    const scraper = new Scraper()

    const validUrl = validateUrl(url)
    const html = await (await fetch(validUrl)).text()
    const dom = domino.createWindow(html).document

    scraper.url = validUrl
    scraper.root = dom

    return scraper
  }

  find(selector: string) {
    const element = this.root?.querySelector(selector)

    if (!element) {
      consola.fail(`no elements found for selector ${selector}`)
      return null
    }

    consola.success(`found element for selector ${selector}`)

    return element
  }

  async getFavicon() {
    const linkElement = this.find('link[rel="icon"]')
      ?? this.find('link[rel="shortcut icon"]')
      ?? this.find('link[rel="apple-touch-icon"]')

    const faviconUrl = linkElement?.getAttribute('href')

    if (!faviconUrl) {
      const faviconIcoUrl = `${this.url.toString()}/favicon.ico`

      try {
        await fetch(faviconIcoUrl, { method: 'head' })
      }
      catch {
        consola.fail('no favicon found')
        return null
      }

      consola.success('/favicon.ico exists')
      return faviconIcoUrl
    }

    consola.success(`favicon found in HTML → ${faviconUrl}`)

    if (faviconUrl.startsWith('/')) {
      return `${this.url.toString()}${faviconUrl.slice(1)}`
    }

    return faviconUrl
  }

  async getOembed() {
    const oembedTagElement = this.find('link[type="application/json+oembed"]')

    if (!oembedTagElement) {
      consola.info('website doesnt seem to have oembed, skipping...')
      return null
    }

    consola.success('detected oembed')

    const oembedUrl = oembedTagElement.getAttribute('href')

    if (!oembedUrl) {
      return null
    }

    return await (await fetch(oembedUrl)).json()
  }
}
