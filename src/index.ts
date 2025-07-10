import cors from '@elysiajs/cors'
import { Console, Effect } from 'effect'
import { Elysia } from 'elysia'
import { InMemoryCacheLayer } from './cache.js'
import { Scraper } from './scraper.js'

const app = new Elysia()

app.use(cors())

app.get('/', ({ request }) => ({
  instruction: `Go to ${request.url}{your-url}`,
  echoscrape: {
    source: 'https://github.com/tijnjh/echoscrape',
  },
}))

app.get('/*', async ({ path, status, request, redirect }) => {
  const program = Effect.gen(function* () {
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
    ], { concurrency: 2 })

    if (faviconOnly && favicon) {
      return { type: 'redirect' as const, url: favicon }
    }

    const metadata = {
      title: (yield* scraper.$('title'))?.textContent,
      description: yield* scraper.getMeta('description'),
      favicon,
      themeColor: yield* scraper.getMeta('theme-color'),
      og: {
        title: yield* scraper.getOg('title'),
        description: yield* scraper.getOg('description'),
        image: yield* scraper.getOg('image'),
        imageAlt: yield* scraper.getOg('image:alt'),
        imageWidth: yield* scraper.getOg('image:width'),
        imageHeight: yield* scraper.getOg('image:height'),
        url: yield* scraper.getOg('url'),
        type: yield* scraper.getOg('type'),
        siteName: yield* scraper.getOg('site_name'),
      },
      twitter: {
        title: yield* scraper.getTwitter('title'),
        description: yield* scraper.getTwitter('description'),
        image: yield* scraper.getTwitter('image'),
        site: yield* scraper.getTwitter('site'),
        card: yield* scraper.getTwitter('card'),
      },
      oembed,
    }

    Effect.logInfo('Responding with metadata')

    return { type: 'success' as const, metadata }
  })

  const res = await Effect.runPromise(
    program.pipe(
      Effect.provide(InMemoryCacheLayer),
      Effect.catchTags({
        InvalidUrlError: error =>
          Effect.succeed({
            type: 'error' as const,
            message: error.message,
            status: 400,
          }),
        LocalhostError: error =>
          Effect.succeed({
            type: 'error' as const,
            message: error.message,
            status: 400,
          }),
        FetchError: error =>
          Effect.succeed({
            type: 'error' as const,
            message: error.message,
            status: 400,
          }),
        ParseError: error =>
          Effect.succeed({
            type: 'error' as const,
            message: error.message,
            status: 400,
          }),
      }),
      Effect.catchAllCause((cause) => {
        console.error('Unexpected error:', cause)
        return Effect.succeed({
          type: 'error' as const,
          message: 'Internal server error',
          status: 500,
        })
      }),
    ),
  )

  switch (res.type) {
    case 'redirect':
      return redirect(res.url)
    case 'error':
      status(res.status)
      return { error: res.message }
    case 'success':
      return res.metadata
  }
})

app.listen(3000)

Effect.runPromise(Console.log(`🦊 Elysia is running at http://localhost:3000`))
