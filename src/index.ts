import type { StatusCode } from 'hono/utils/http-status'
import { FetchHttpClient } from '@effect/platform'
import { consola } from 'consola'
import { Effect } from 'effect'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Scraper } from './scraper'
import { objectOrUndefined, tryCache } from './utils'

const app = new Hono()

app.use(cors())

app.get('/', c => c.json({
  instruction: `Go to ${c.req.url}{your-url}`,
  echoscrape: {
    source: 'https://github.com/tijnjh/echoscrape',
  },
}))

app.get('/*', async (c) => {
  const program = Effect.fn(function* (path: string, request: Request) {
    if (path.startsWith('/')) {
      path = path.slice(1)
    }

    const faviconOnly = new URL(request.url).searchParams.has('favicon')

    Effect.logInfo(path)
    const scraper = new Scraper()
    yield* scraper.init(path)

    const [favicon, oembed] = yield* Effect.all([
      scraper.getFavicon(),
      !faviconOnly ? scraper.getOembed() : Effect.succeed(null),
    ], { concurrency: 'unbounded' })

    if (faviconOnly && favicon) {
      return { type: 'redirect' as const, url: favicon }
    }

    const { $ } = scraper

    const metadata = {
      title: (yield* $('title'))?.textContent,
      description: (yield* $('meta[name=description]'))?.getAttribute('content'),
      favicon,
      themeColor: (yield* $('meta[name=theme-color]'))?.getAttribute('content'),
      og: objectOrUndefined({
        title: (yield* $('meta[property=og:title]'))?.getAttribute('content'),
        description: (yield* $('meta[property=og:description]'))?.getAttribute('content'),
        image: (yield* $('meta[property=og:image]'))?.getAttribute('content'),
        imageAlt: (yield* $('meta[property=og:image:alt]'))?.getAttribute('content'),
        imageWidth: (yield* $('meta[property=og:image:width]'))?.getAttribute('content'),
        imageHeight: (yield* $('meta[property=og:image:height]'))?.getAttribute('content'),
        url: (yield* $('meta[property=og:url]'))?.getAttribute('content'),
        type: (yield* $('meta[property=og:type]'))?.getAttribute('content'),
        siteName: (yield* $('meta[property=og:site_name]'))?.getAttribute('content'),
      }),
      twitter: objectOrUndefined({
        title: (yield* $('meta[name=twitter:title]'))?.getAttribute('content'),
        description: (yield* $('meta[name=twitter:description]'))?.getAttribute('content'),
        image: (yield* $('meta[name=twitter:image]'))?.getAttribute('content'),
        site: (yield* $('meta[name=twitter:site]'))?.getAttribute('content'),
        card: (yield* $('meta[name=twitter:card]'))?.getAttribute('content'),
      }),
      oembed: oembed ? objectOrUndefined(oembed) : undefined,
    }

    consola.success('Responding with metadata...')

    return { type: 'success' as const, metadata }
  })

  const res = await Effect.runPromise(
    tryCache(c.req.path, () => program(c.req.path, c.req.raw).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.catchTags({
        InvalidUrlError: error => Effect.succeed({
          type: 'error',
          message: error.message,
          status: 400,
        } as const),
        LocalhostError: error => Effect.succeed({
          type: 'error',
          message: error.message,
          status: 400,
        } as const),
        FetchError: error => Effect.succeed({
          type: 'error',
          message: error.message,
          status: 400,
        } as const),
        ParseError: error => Effect.succeed({
          type: 'error',
          message: error.message,
          status: 400,
        } as const),
        RequestError: error => Effect.succeed({
          type: 'error',
          message: error.message,
          status: 400,
        } as const),
        ResponseError: error => Effect.succeed({
          type: 'error',
          message: error.message,
          status: 500,
        } as const),
      }),
      Effect.catchAllCause((cause) => {
        Effect.runPromise(Effect.logError('Unexpected error:', cause))
        return Effect.succeed({
          type: 'error',
          message: 'Internal server error',
          status: 500,
        } as const)
      }),
    )),
  )
  switch (res.type) {
    case 'redirect':
      return c.redirect(res.url)
    case 'error':
      c.status(res.status as StatusCode)
      return c.json({ error: res.message })
    case 'success':
      return c.json(res.metadata)
  }
})

// ignore favicon requests
app.get('/favicon.ico', c => c.json({}))

export default app
