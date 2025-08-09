import type { Metadata } from './lib/types'
import { consola } from 'consola'
import { Elysia } from 'elysia'
import { Cache } from './lib/cache'
import { Scraper } from './lib/scraper'
import { orUndefined } from './lib/utils'

const app = new Elysia()
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
      title: scraper.find('title')?.text(),
      description: scraper.find('meta[name="description"]')?.attr('content'),
      favicon: favicon ?? undefined,
      theme_color: scraper.find('meta[name="theme-color"]')?.attr('content'),
      og: orUndefined({
        title: scraper.find('meta[property="og:title"]')?.attr('content'),
        description: scraper.find('meta[property="og:description"]')?.attr('content'),
        image: scraper.find('meta[property="og:image"]')?.attr('content'),
        image_alt: scraper.find('meta[property="og:image:alt"]')?.attr('content'),
        image_width: scraper.find('meta[property="og:image:width"]')?.attr('content'),
        image_height: scraper.find('meta[property="og:image:height"]')?.attr('content'),
        url: scraper.find('meta[property="og:url"]')?.attr('content'),
        type: scraper.find('meta[property="og:type"]')?.attr('content'),
        site_name: scraper.find('meta[property="og:site_name"]')?.attr('content'),
      }),
      twitter: orUndefined({
        title: scraper.find('meta[name="twitter:title"]')?.attr('content'),
        description: scraper.find('meta[name="twitter:description"]')?.attr('content'),
        image: scraper.find('meta[name="twitter:image"]')?.attr('content'),
        site: scraper.find('meta[name="twitter:site"]')?.attr('content'),
        card: scraper.find('meta[name="twitter:card"]')?.attr('content'),
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

  const text = scraper.find(query.selector)?.text()

  return text
})

app.listen(3000)

consola.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`)
