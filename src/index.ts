import type { Metadata } from './lib/types'
import cors from '@elysiajs/cors'
import { consola } from 'consola'
import { Elysia } from 'elysia'
import pkg from '../package.json'
import { Scraper } from './lib/scraper'
import { undefinedOnEmpty } from './lib/utils'

const app = new Elysia().use(cors())

app.get('/', ({ request }) => {
  const url = new URL(request.url)

  const addr = `${url.protocol}//${url.host}`

  return {
    name: 'echoscrape',
    about: 'minimal api for scraping metadata, favicons, and text from public sites',
    repo: 'https://github.com/tijnjh/echoscrape',
    license: pkg.license,
    endpoints: {
      metadata: {
        GET: `/metadata/{host}`,
        note: 'returns site metadata (title, description, og, twitter, oembed, etc)',
        example: `${addr}/metadata/react.dev`,
      },
      favicon: {
        GET: `/favicon/{host}`,
        note: 'redirects to site favicon if found',
        example: `${addr}/favicon/vite.dev`,
      },
      text: {
        GET: `/text/{host}?selector={css_selector}`,
        note: 'returns textContent of first matching element',
        example: `${addr}/text/bun.com?selector=h1`,
      },
    },
  }
})

app.get('/*', ({ redirect }) => redirect('/'))

app.get('/metadata/*', async ({ params }) => {
  const url = params['*']

  const scraper = await Scraper.init(url)

  const [favicon, oembed] = await Promise.all([
    scraper.getFavicon(),
    scraper.getOembed(),
  ])

  return {
    title: scraper.find('title')?.textContent,
    description: scraper.find('meta[name="description"]')?.getAttribute('content') ?? undefined,
    favicon: favicon ?? undefined,
    theme_color: scraper.find('meta[name="theme-color"]')?.getAttribute('content') ?? undefined,
    og: undefinedOnEmpty({
      title: scraper.find('meta[property="og:title"]')?.getAttribute('content') ?? undefined,
      description: scraper.find('meta[property="og:description"]')?.getAttribute('content') ?? undefined,
      image: scraper.find('meta[property="og:image"]')?.getAttribute('content') ?? undefined,
      image_alt: scraper.find('meta[property="og:image:alt"]')?.getAttribute('content') ?? undefined,
      image_width: scraper.find('meta[property="og:image:width"]')?.getAttribute('content') ?? undefined,
      image_height: scraper.find('meta[property="og:image:height"]')?.getAttribute('content') ?? undefined,
      url: scraper.find('meta[property="og:url"]')?.getAttribute('content') ?? undefined,
      type: scraper.find('meta[property="og:type"]')?.getAttribute('content') ?? undefined,
      site_name: scraper.find('meta[property="og:site_name"]')?.getAttribute('content') ?? undefined,
    }),
    twitter: undefinedOnEmpty({
      title: scraper.find('meta[name="twitter:title"]')?.getAttribute('content') ?? undefined,
      description: scraper.find('meta[name="twitter:descr-iption"]')?.getAttribute('content') ?? undefined,
      image: scraper.find('meta[name="twitter:image"]')?.getAttribute('content') ?? undefined,
      site: scraper.find('meta[name="twitter:site"]')?.getAttribute('content') ?? undefined,
      card: scraper.find('meta[name="twitter:card"]')?.getAttribute('content') ?? undefined,
    }),
    oembed: undefinedOnEmpty(oembed),
  } satisfies Metadata
})

app.get('/favicon/*', async ({ params, redirect }) => {
  const url = params['*']
  const scraper = await Scraper.init(url)
  const favicon = await scraper.getFavicon()
  return favicon ? redirect(favicon) : 'no favicon found'
})

app.get('/text/*', async ({ params, query }) => {
  const url = params['*']
  const scraper = await Scraper.init(url)
  const text = scraper.find(query.selector)?.textContent
  return text
})

app.listen(3000)

consola.log(`꩜ Echoscrape is running at http://${app.server?.hostname}:${app.server?.port}`)
