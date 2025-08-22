import type { Metadata } from './lib/types'
import cors from '@elysiajs/cors'
import { consola } from 'consola'
import { Effect } from 'effect'
import { Elysia } from 'elysia'
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

app.get('/*', c => c.redirect('/'))

app.get('/metadata/*', async (c) => {
  const url = c.params['*']

  return await cache.tryCache(`metadata-${url}`, async () => {
    const scraper = new Scraper(url)

    // scraper.initializeDocument.pipe(Effect.allSuccesses)

    const metadata: Metadata = await Effect.all({
      title: scraper.find('title').pipe(Effect.andThen(e => e.textContent)),
      description: scraper.find('meta[name="description"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
      favicon: scraper.getFavicon,
      theme_color: scraper.find('meta[name="theme-color"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
      og: Effect.allSuccesses({
        title: scraper.find('meta[property="og:title"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
        description: scraper.find('meta[property="og:description"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
        image: scraper.find('meta[property="og:image"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
        image_alt: scraper.find('meta[property="og:image:alt"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
        image_width: scraper.find('meta[property="og:image:width"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
        image_height: scraper.find('meta[property="og:image:height"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
        url: scraper.find('meta[property="og:url"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
        type: scraper.find('meta[property="og:type"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
        site_name: scraper.find('meta[property="og:site_name"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
      }).pipe(Effect.andThen(obj => orUndefined(obj))),
      twitter: Effect.allSuccesses({
        title: scraper.find('meta[name="twitter:title"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
        description: scraper.find('meta[name="twitter:description"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
        image: scraper.find('meta[name="twitter:image"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
        site: scraper.find('meta[name="twitter:site"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
        card: scraper.find('meta[name="twitter:card"]').pipe(Effect.andThen(e => e.getAttribute('content'))),
      }).pipe(Effect.andThen(obj => orUndefined(obj))),
      oembed: scraper.getOembed.pipe(Effect.andThen(obj => orUndefined(obj))),
    }, { concurrency: 'unbounded' }).pipe(Effect.runSync)

    return metadata
  })
})

app.get('/favicon/*', (c) => {
  const url = c.params['*']

  return new Scraper(url).getFavicon.pipe(
    Effect.andThen(faviconUrl => c.redirect(faviconUrl)),
    Effect.orElseSucceed(() => 'no favicon found'),
    Effect.runSync,
  )
})

app.get('/text/*', (c) => {
  const url = c.params['*']

  return new Scraper(url).find(c.query.selector).pipe(
    Effect.andThen(e => e.textContent),
    Effect.orElseSucceed(() => undefined),
    Effect.runSync,
  )
})

app.listen(3000)

consola.log(`꩜ Echoscrape is running at http://${app.server?.hostname}:${app.server?.port}`)
