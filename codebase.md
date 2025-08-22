# .gitignore

```
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env.local
.env.development.local
.env.test.local
.env.production.local

# vercel
.vercel

**/*.trace
**/*.zip
**/*.tar.gz
**/*.tgz
**/*.log
package-lock.json
**/*.bun
```

# eslint.config.mjs

```mjs
import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'antfu/top-level-function': 'off',
  },
})

```

# package.json

```json
{
  "license": "AGPL-3.0",
  "module": "src/index.js",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun . "
  },
  "dependencies": {
    "@elysiajs/cors": "^1.3.3",
    "consola": "^3.4.2",
    "effect": "^3.17.9",
    "elysia": "^1.3.13",
    "jsdom": "^26.1.0"
  },
  "devDependencies": {
    "@antfu/eslint-config": "^5.2.1",
    "@types/jsdom": "^21.1.7",
    "bun-types": "^1.2.20",
    "eslint": "^9.33.0"
  }
}
```

# README.md

```md
# echoscrape

[demo](https://wg.tijn.dev/?h=s0nLL8q141JQsMnMKygtUchMsVUqLcpRUiipLEi1VSpJrShRQpKGiBaXJuVmgsRt9CHauWxSMsvAeotSi0tzgFI2%7EkAROwA&c=LYxBCoAgFAX3nuJBtBQyaGOnEbT60K9IIyW8exptZ4ZpTuevNeARwGGspW3WUKfjsYBp34KcDNOaNHzywbG8qBo2Ud5kw6IxqP6IoyiQeP4%7EwK9U17W1ziLjBQ&j=bZFNT8MwDIbv_RVRtEMiTSlwhG0HEBIgPg7jhpAWUq_NlCYldSemqf8dp6UTSJwc2Y9fv3ZM8C2ybYj1rWNLVgTT1eBRfXYQD2twYDBEwRPA5VU24hHazuHfhhIoAel5fbgvBB8ZLrNsFFfU2X3UFqlJgGTLFTtmjI2C1jddKoBCHUnp7exd7bXrgIhpmEL4wpvgkUYQyl3QhfUlJ2QLaCqxqRCb9jLPwVShNVE3JGd3XhWwz2tAXWjU%7Eew4DOs3UmEFXgjSH9xQVLs2eCGnSuJPRn8Zsd5DvHt9eiQbm6HE2KI6X82OqYNmooN%7EkVNmKtq6ZG00S_6DhFLZWpfQc8byE9VMCgWQfdugDZ50mhHYZENIBwsOlAuleFi_PKsWI53Bbg%7ED3znznXNzdiEl4b1URqfbCIgxxGGZfbAFS1v_d9URo4_us28)

minimal api for scraping metadata, favicons, and text from public sites

for example, heres the metadata from react.dev:

<img width="572" src="https://github.com/user-attachments/assets/25a8fa08-dc71-4bc3-8d2e-c12d9d84c673" />

```

# src/index.ts

```ts
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

  return await cache.tryCache<Metadata>(`metadata-${url}`, Effect.gen(function* () {
    const scraper = new Scraper(url)

    const [favicon, oembed] = yield* Effect.all([
      scraper.getFavicon,
      scraper.getOembed,
    ]).pipe(Effect.orElseSucceed(() => [null, null]))

    const metadata: Metadata = {
      title: yield* scraper.find('title').pipe(Effect.andThen(e => e.textContent), Effect.orElseSucceed(() => null)),
      description: yield* scraper.find('meta[name="description"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
      favicon,
      theme_color: yield* scraper.find('meta[name="theme-color"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
      og: orUndefined({
        title: yield* scraper.find('meta[property="og:title"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
        description: yield* scraper.find('meta[property="og:description"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
        image: yield* scraper.find('meta[property="og:image"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
        image_alt: yield* scraper.find('meta[property="og:image:alt"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
        image_width: yield* scraper.find('meta[property="og:image:width"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
        image_height: yield* scraper.find('meta[property="og:image:height"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
        url: yield* scraper.find('meta[property="og:url"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
        type: yield* scraper.find('meta[property="og:type"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
        site_name: yield* scraper.find('meta[property="og:site_name"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
      }),
      twitter: orUndefined({
        title: yield* scraper.find('meta[name="twitter:title"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
        description: yield* scraper.find('meta[name="twitter:description"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
        image: yield* scraper.find('meta[name="twitter:image"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
        site: yield* scraper.find('meta[name="twitter:site"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
        card: yield* scraper.find('meta[name="twitter:card"]').pipe(Effect.andThen(e => e.getAttribute('content')), Effect.orElseSucceed(() => null)),
      }),
      oembed: orUndefined(oembed),
    }

    return metadata
  }))
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
    Effect.orElseSucceed(() => null),
    Effect.runSync,
  )
})

app.listen(3000)

consola.log(`꩜ Echoscrape is running at http://${app.server?.hostname}:${app.server?.port}`)

```

# src/lib/cache.ts

```ts
import { consola } from 'consola'
import { Effect } from 'effect/index'

export class Cache {
  #cache: Record<string, any> = {}

  tryCache<A, E = never>(key: string, effect: Effect.Effect<A, E>) {
    const cached = this.get<A>(key)

    if (!cached) {
      return Effect.runPromise(effect)
        .catch((error) => {
          throw new Error(`something went wrong when trying to execute the getter effect for key: ${key}:\n ${JSON.stringify(error)}`)
        })
        .then((val) => {
          this.set(key, val)
          return val
        })
    }

    return cached
  }

  private get<T = any>(key: string) {
    const item = this.#cache[key]

    if (!item) {
      consola.fail(`(cache) Cache miss for '${key}'...`)
      return null
    }

    consola.success(`(cache) Cache hit for '${key}'. Returning cached data.`)
    return item as T
  }

  private set(key: string, val: any) {
    this.#cache[key] = val
    consola.success(`(cache) Data cached for '${key}'.`)
  }
}

```

# src/lib/scraper.ts

```ts
import { consola } from 'consola'
import { Effect } from 'effect'
import { JSDOM } from 'jsdom'

const validateUrl = (rawUrl: string) => Effect.gen(function* () {
  if (rawUrl.endsWith('/')) {
    rawUrl = rawUrl.slice(0, -1)
  }

  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = `http://${rawUrl}`
  }

  const parsedUrl = new URL(rawUrl)

  if (['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)) {
    return yield* Effect.fail(new Error('blocked access to localhost'))
  }

  return parsedUrl
})

export class Scraper {
  private url: URL
  private root!: Document

  constructor(url: string) {
    this.url = Effect.runSync(validateUrl(url))

    fetch(this.url).then(r => r.text()).then((html) => {
      this.root = new JSDOM(html).window.document
    })
  }

  find = (selector: string) => Effect.gen(this, function* () {
    const element = this.root?.querySelector(selector)

    if (!element) {
      consola.fail(`no elements found for selector ${selector}`)
      return yield* Effect.fail(new Error('failed to find element'))
    }

    consola.success(`Found element for selector ${selector}`)

    return element
  })

  getFavicon = Effect.gen(this, function* () {
    const linkElement = yield* Effect.firstSuccessOf([
      this.find('link[rel="icon"]'),
      this.find('link[rel="shortcut icon"]'),
      this.find('link[rel="apple-touch-icon"]'),
    ])

    const faviconUrl = linkElement.getAttribute('href')

    if (!faviconUrl) {
      const faviconIcoUrl = `${this.url.toString()}/favicon.ico`

      Effect.tryPromise({
        try: () => fetch(faviconIcoUrl, { method: 'HEAD' }),
        catch: () => {
          consola.fail('no favicon found')
          return Effect.fail(new Error('no favicon found'))
        },
      })

      consola.success('/favicon.ico exists')
      return faviconIcoUrl
    }

    consola.success(`favicon found in HTML → ${faviconUrl}`)

    if (faviconUrl.startsWith('/')) {
      return `${this.url.toString()}${faviconUrl.slice(1)}`
    }

    return faviconUrl
  })

  getOembed = Effect.gen(this, function* () {
    const oembedTagElement = yield* this.find('link[type="application/json+oembed"]').pipe(Effect.orElseFail(() => {
      consola.info('website doesnt seem to have oembed, skipping...')
      return Effect.fail(new Error('no oembed link tag found'))
    }))

    consola.success('detected oembed')

    const oembedUrl = oembedTagElement.getAttribute('href')

    if (!oembedUrl) {
      return yield* Effect.fail(new Error('oembed link tag lacks href attribute'))
    }

    const res = yield* Effect.tryPromise({
      try: () => fetch(oembedUrl).then(r => r.json()),
      catch: () => new Error('failed to fetch oembed url'),
    })

    return res as Record<string, string>
  })
}

```

# src/lib/types.ts

```ts
type OrNullish<T> = T | null | undefined

export interface Metadata {
  title: OrNullish<string>
  description: OrNullish<string>
  favicon: OrNullish<string>
  theme_color: OrNullish<string>
  og: OrNullish<{
    title: OrNullish<string>
    description: OrNullish<string>
    image: OrNullish<string>
    image_alt: OrNullish<string>
    image_width: OrNullish<string>
    image_height: OrNullish<string>
    url: OrNullish<string>
    type: OrNullish<string>
    site_name: OrNullish<string>
  }>
  twitter: OrNullish<{
    title: OrNullish<string>
    description: OrNullish<string>
    image: OrNullish<string>
    site: OrNullish<string>
    card: OrNullish<string>
  }>
  oembed: OrNullish<Record<string, string>>
}

```

# src/lib/utils.ts

```ts
export function orUndefined<T extends object>(obj: T | null | undefined): T | undefined {
  if (!obj)
    return undefined

  if (Object.values(obj).every(v => !v))
    return undefined

  return obj
}

```

# tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ES2022",
    "moduleResolution": "node",
    "types": ["bun-types"],
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}

```

