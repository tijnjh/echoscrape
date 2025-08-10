import type { Metadata } from './lib/types'
import { consola } from 'consola'
import { Elysia } from 'elysia'
import { Cache } from './lib/cache'
import { Scraper } from './lib/scraper'
import { orUndefined } from './lib/utils'
import cors from '@elysiajs/cors'

const app = new Elysia().use(cors())
const cache = new Cache()

app.get('/', ({ request }) => {
  const url = new URL(request.url)

  const addr = `${url.protocol}//${url.host}`

  return {
    example: `Go to ${addr}/metadata/react.dev`,
    source: 'https://github.com/tijnjh/echoscrape',
  }
})

app.get('/metadata/*', async ({ params }) => {
  const url = params['*']

  return cache.tryCache<Metadata>(`metadata-${url}`, async () => {
    const scraper = new Scraper(url)
    await scraper.init()

    const [favicon, oembed] = await Promise.all([
      scraper.getFavicon(),
      scraper.getOembed(),
    ])

    return {
      title: scraper.find('title')?.textContent,
      description: scraper.find('meta[name="description"]')?.getAttribute('content'),
      favicon,
      theme_color: scraper.find('meta[name="theme-color"]')?.getAttribute('content'),
      og: orUndefined({
        title: scraper.find('meta[property="og:title"]')?.getAttribute('content'),
        description: scraper.find('meta[property="og:description"]')?.getAttribute('content'),
        image: scraper.find('meta[property="og:image"]')?.getAttribute('content'),
        image_alt: scraper.find('meta[property="og:image:alt"]')?.getAttribute('content'),
        image_width: scraper.find('meta[property="og:image:width"]')?.getAttribute('content'),
        image_height: scraper.find('meta[property="og:image:height"]')?.getAttribute('content'),
        url: scraper.find('meta[property="og:url"]')?.getAttribute('content'),
        type: scraper.find('meta[property="og:type"]')?.getAttribute('content'),
        site_name: scraper.find('meta[property="og:site_name"]')?.getAttribute('content'),
      }),
      twitter: orUndefined({
        title: scraper.find('meta[name="twitter:title"]')?.getAttribute('content'),
        description: scraper.find('meta[name="twitter:description"]')?.getAttribute('content'),
        image: scraper.find('meta[name="twitter:image"]')?.getAttribute('content'),
        site: scraper.find('meta[name="twitter:site"]')?.getAttribute('content'),
        card: scraper.find('meta[name="twitter:card"]')?.getAttribute('content'),
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

  if (!favicon)
    return 'No favicon found'

  return redirect(favicon)
})

app.get('/text/*', async ({ params, query }) => {
  const url = params['*']

  const scraper = new Scraper(url)
  await scraper.init()

  const text = scraper.find(query.selector)?.textContent

  return text
})

app.listen(3000)

consola.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`)
