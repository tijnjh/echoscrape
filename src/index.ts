import type { Metadata } from './lib/types'
import cors from '@elysiajs/cors'
import { consola } from 'consola'
import { Elysia } from 'elysia'
import { Result } from 'neverthrow'
import pkg from '../package.json'
import { Cache } from './lib/cache'
import { Scraper } from './lib/scraper'
import { orUndefined } from './lib/utils'

const app = new Elysia().use(cors())
const cache = new Cache()

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

  return cache.tryCache(`metadata- ${url} `, async () => {
    const scraper = new Scraper(url)
    await scraper.init()

    const res = Result.combine(await Promise.all([
      scraper.getFavicon(),
      scraper.getOembed(),
    ]))

    const [favicon, oembed] = res.unwrapOr([null, null])

    return {
      title: scraper.find('title').unwrapOr(null)?.textContent,
      description: scraper.find('meta[name="description"]').unwrapOr(null)?.getAttribute('content'),
      favicon,
      theme_color: scraper.find('meta[name="theme-color"]').unwrapOr(null)?.getAttribute('content'),
      og: orUndefined({
        title: scraper.find('meta[property="og:title"]').unwrapOr(null)?.getAttribute('content'),
        description: scraper.find('meta[property="og:description"]')?.unwrapOr(null)?.getAttribute('content'),
        image: scraper.find('meta[property="og:image"]').unwrapOr(null)?.getAttribute('content'),
        image_alt: scraper.find('meta[property="og:image:alt"]').unwrapOr(null)?.getAttribute('content'),
        image_width: scraper.find('meta[property="og:image:width"]').unwrapOr(null)?.getAttribute('content'),
        image_height: scraper.find('meta[property="og:image:height"]').unwrapOr(null)?.getAttribute('content'),
        url: scraper.find('meta[property="og:url"]').unwrapOr(null)?.getAttribute('content'),
        type: scraper.find('meta[property="og:type"]').unwrapOr(null)?.getAttribute('content'),
        site_name: scraper.find('meta[property="og:site_name"]').unwrapOr(null)?.getAttribute('content'),
      }),
      twitter: orUndefined({
        title: scraper.find('meta[name="twitter:title"]').unwrapOr(null)?.getAttribute('content'),
        description: scraper.find('meta[name="twitter:description"]').unwrapOr(null)?.getAttribute('content'),
        image: scraper.find('meta[name="twitter:image"]').unwrapOr(null)?.getAttribute('content'),
        site: scraper.find('meta[name="twitter:site"]').unwrapOr(null)?.getAttribute('content'),
        card: scraper.find('meta[name="twitter:card"]').unwrapOr(null)?.getAttribute('content'),
      }),
      oembed: orUndefined(oembed),
    } satisfies Metadata
  })
})

app.get('/favicon/*', async ({ params, redirect }) => {
  const url = params['*']

  const scraper = new Scraper(url)
  await scraper.init()

  const favicon = await scraper.getFavicon()

  if (favicon.isErr())
    return 'No favicon found'

  return redirect(favicon.value)
})

app.get('/text/*', async ({ params, query }) => {
  const url = params['*']

  const scraper = new Scraper(url)
  await scraper.init()

  const text = scraper.find(query.selector).unwrapOr(null)?.textContent

  return text
})

app.listen(3000)

consola.log(`꩜ Echoscrape is running at http://${app.server?.hostname}:${app.server?.port}`)
