import type { Metadata } from './lib/types'
import cors from '@elysiajs/cors'
import { consola } from 'consola'
import { Effect } from 'effect'
import { ParseError } from 'effect/ParseResult'
import { Elysia } from 'elysia'
import pkg from '../package.json'
import { Cache } from './lib/cache'
import { Scraper } from './lib/scraper'
import { orUndefined } from './lib/utils'

const app = new Elysia().use(cors())

const cache = new Cache()

app.get('/', (c) => {
  const url = new URL(c.request.url)
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

app.get('/metadata/*', c => Effect.runPromise(Effect.gen(function* () {
  const url = c.params['*']
  return yield* cache.tryCache(`metadata-${url}`, Effect.gen(function* () {
    const scraper = yield* Scraper.init(url)
    const metadata: Metadata = yield* Effect.all({
      title: scraper.find('title').pipe(Effect.andThen(e => e.textContent), Effect.orElseSucceed(() => undefined)),
      description: scraper.find('meta[name="description"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
      favicon: scraper.getFavicon.pipe(Effect.orElseSucceed(() => undefined)),
      theme_color: scraper.find('meta[name="theme-color"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
      og: Effect.all({
        title: scraper.find('meta[property="og:title"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
        description: scraper.find('meta[property="og:description"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
        image: scraper.find('meta[property="og:image"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
        image_alt: scraper.find('meta[property="og:image:alt"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
        image_width: scraper.find('meta[property="og:image:width"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
        image_height: scraper.find('meta[property="og:image:height"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
        url: scraper.find('meta[property="og:url"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
        type: scraper.find('meta[property="og:type"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
        site_name: scraper.find('meta[property="og:site_name"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
      }).pipe(Effect.andThen(obj => orUndefined(obj))),
      twitter: Effect.all({
        title: scraper.find('meta[name="twitter:title"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
        description: scraper.find('meta[name="twitter:description"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
        image: scraper.find('meta[name="twitter:image"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
        site: scraper.find('meta[name="twitter:site"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
        card: scraper.find('meta[name="twitter:card"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => undefined)),
      }).pipe(Effect.andThen(obj => orUndefined(obj))),
      oembed: scraper.getOembed.pipe(Effect.andThen(obj => orUndefined(obj)), Effect.mapError((e) => {
        if (e instanceof ParseError) {
          consola.error(e)
        }
      }), Effect.orElseSucceed(() => undefined)),
    }, { concurrency: 'unbounded' })
    return metadata
  }))
})))

app.get('/favicon/*', c => Effect.runPromise(Effect.gen(function* () {
  const url = c.params['*']
  return yield* Scraper.init(url).pipe(
    Effect.andThen(scraper => scraper.getFavicon),
    Effect.andThen(faviconUrl => c.redirect(faviconUrl)),
  )
})))

app.get('/text/*', c => Effect.runPromise(Effect.gen(function* () {
  const url = c.params['*']
  return yield* Scraper.init(url).pipe(
    Effect.andThen(scraper => scraper.find(c.query.selector)),
    Effect.andThen(e => e.textContent),
  )
})))

app.listen(3000)

consola.log(`꩜ Echoscrape is running at http://${app.server?.hostname}:${app.server?.port}`)
