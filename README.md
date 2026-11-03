---
name: Feature Flags with Kameleoon
slug: feature-flag-kameleoon
description: Kameleoon feature flags and experiments in a Next.js 16 app on Vercel, evaluated in Edge Middleware before rendering.
framework: Next.js
useCase: Edge Middleware
css: Tailwind
deployUrl: https://vercel.com/new/clone?repository-url=https://github.com/Kameleoon-new/vercel-starter-kit/tree/main&env=KAMELEOON_SITE_CODE,KAMELEOON_CLIENT_ID,KAMELEOON_CLIENT_SECRET&project-name=feature-flag-kameleoon&repository-name=feature-flag-kameleoon
demoUrl: https://feature-flag-kameleoon.vercel.app
---

# Feature Flags with Kameleoon

Run [Kameleoon](https://www.kameleoon.com) feature flags and experiments in a [Next.js 16](https://nextjs.org) application deployed on [Vercel](https://vercel.com). The [Kameleoon Node.js SDK](https://developers.kameleoon.com/feature-management-and-experimentation/web-sdks/nodejs-sdk) evaluates flags in Next.js [Middleware](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) on the Edge runtime, next to the visitor, before a page is rendered. Each variation is a plain static page served from the CDN.

## Demo

https://feature-flag-kameleoon.vercel.app

## Requirements

- Next.js 16 (App Router), Node.js 20.9+
- `@kameleoon/nodejs-sdk` 5.29+
- A [Kameleoon account](https://app.kameleoon.com) with a feature flag (see [Set up Kameleoon](#set-up-kameleoon))

## How to use

> [!IMPORTANT]
> To get the flag configuration from Vercel Global Config, install the [Kameleoon integration](https://vercel.com/integrations/kameleoon) by following https://developers.kameleoon.com/setting-up-vercel/. It is optional: without it the SDK fetches the configuration from the Kameleoon CDN.

### One-click deploy

Create your feature flag first ([Set up Kameleoon](#set-up-kameleoon)), then:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Kameleoon-new/vercel-starter-kit/tree/main&env=KAMELEOON_SITE_CODE,KAMELEOON_CLIENT_ID,KAMELEOON_CLIENT_SECRET&project-name=feature-flag-kameleoon&repository-name=feature-flag-kameleoon)

### Clone and run locally

```bash
pnpm create next-app --example https://github.com/Kameleoon-new/vercel-starter-kit/tree/main
cp .env.example .env.local
pnpm dev
```

Environment variables (`.env.local` locally, project settings on Vercel):

| Variable | Required | Where to find it |
| --- | --- | --- |
| `KAMELEOON_SITE_CODE` | yes | [Kameleoon project dashboard](https://app.kameleoon.com/projects/dashboard) |
| `KAMELEOON_CLIENT_ID`, `KAMELEOON_CLIENT_SECRET` | yes | Kameleoon profile settings, API credentials |
| `GLOBAL_CONFIG` | with `DatafileSource.GlobalConfig` | Created automatically when you connect a Global Config store to the project. |

If your project still has `EDGE_CONFIG`, the variable name used before Vercel renamed Edge Config to [Global Config](https://vercel.com/docs/global-config/migration-guide), rename it to `GLOBAL_CONFIG`.

## How it works

```
browser ──> Vercel CDN ──> middleware.ts (Edge runtime)     ──> /               (static page)
                           │  Kameleoon SDK: getVariation     └> /new-home-page (static page)
                           │  config from Global Config
                           └─ Set-Cookie: kameleoonVisitorCode
```

1. `middleware.ts` runs on every request to `/` and `/new-home-page`, in the Vercel point of presence closest to the visitor. It creates the SDK client once per edge isolate and reuses it while the isolate is alive.
2. The configuration (data file) request is served by `lib/requester.ts`, from Global Config by default (about a millisecond, no network round trip). Everything else (tracking, access token) goes to Kameleoon over `fetch`.

   > Kameleoon writes the configuration into the store under `{SITE_CODE}_V3`. The requester derives the version from the configuration URL the SDK requests (`https://sdk-config.kameleoon.eu/v3/...`), so the item always matches the format the installed SDK expects. If Kameleoon releases a new breaking configuration format (e.g. `{SITE_CODE}_V4`), upgrading `@kameleoon/nodejs-sdk` to a version that supports it is enough.

3. The visitor code is read from the `kameleoonVisitorCode` cookie, or generated for a first-time visitor and written to the response, so the decision sticks for that browser.
4. The middleware evaluates the `new_home_page` flag and rewrites the request to the page of its variation (`on` → `/new-home-page`, otherwise `/`, including when the flag is disabled or missing). The visitor keeps the URL they asked for; the CDN serves the variation's static page.
5. The visitor code and the Engine.js tracking code are forwarded to the page as request headers (see [Flags inside pages](#flags-inside-pages-cache-components)). Any `x-kameleoon-*` headers sent by the client are dropped first.

Settings, the same ones as in the other Kameleoon starter kits (`lib/constants.ts` holds the credentials and the data file source, `middleware.ts` the rest):

| Constant | Default | Meaning |
| --- | --- | --- |
| `FEATURE_KEY` | `new_home_page` | The flag whose variation picks the page: `on` → `/new-home-page`, otherwise `/` |
| `DATAFILE_SOURCE` | `DatafileSource.GlobalConfig` | Where the SDK configuration (data file) comes from. `GlobalConfig` (recommended): read from the Global Config store the Kameleoon integration keeps in sync (needs `GLOBAL_CONFIG`); if the store can't be read, the requester logs a warning and makes the request below instead. `Kameleoon`: the SDK's usual request to the Kameleoon CDN (`https://sdk-config.kameleoon.eu/v3/<siteCode>`), as in the other starter kits. |
| `TRACK_IN_MIDDLEWARE` | `false` | `true`: the middleware sends exposure events itself with `flushInstant()` in `event.waitUntil()`, skipping prefetch requests (see below). `false` (recommended): the middleware forwards `getEngineTrackingCode()` and tracking is done in the browser by [Engine.js](https://developers.kameleoon.com/feature-management-and-experimentation/web-sdks/nodejs-sdk/#getenginetrackingcode) or the JS/React SDK, which must be installed on the page. |
| `ENABLE_DATAFILE_REFRESH` | `true` | `true`: every request calls `refreshDataFileIfStale()` in the background so isolates pick up configuration changes (a disabled flag, say) within `DATAFILE_UPDATE_INTERVAL_MINUTES` (1 minute). `false`: an isolate keeps the configuration it loaded at startup, for as long as it lives (the SDK's own background updates are disabled, see `lib/eventSource.ts`). |

### Why these defaults on Vercel

An edge isolate has no guaranteed lifetime and nothing runs in it between requests, so timers can't be relied on. Two SDK features depend on timers:

- **Tracking** is batched and sent on an interval. With `TRACK_IN_MIDDLEWARE = true` the kit calls `flushInstant(visitorCode)` inside `event.waitUntil()`, which keeps the invocation alive until the request has been sent without delaying the response. If you track in the middleware, keep that call.

  Prefetches are routed like any other request, so the prefetched page is the right variation, but they are not counted as exposures. Browser prefetches (`purpose: prefetch`, `sec-purpose: prefetch`) are recognised as is. Next.js router prefetches (`<Link>`) are not: Next.js strips their `next-router-prefetch` header before the middleware runs. To exclude them too, set `skipProxyUrlNormalize: true` in `next.config.ts`, which keeps the header (and the `_rsc` query parameter) visible to the middleware.
- **Configuration polling** also runs on a timer. `refreshDataFileIfStale()` does the same check on demand: it is a no-op while the data file is younger than the interval and re-reads it otherwise. With Global Config a re-read costs about a millisecond, so a 1-minute interval is fine.

Real-time (SSE) configuration updates need a long-lived connection and are disabled (`lib/eventSource.ts`); `refreshDataFileIfStale()` is the only refresh path.

If anything in the Kameleoon path fails (missing variable, store unreachable, SDK error) the middleware logs the error and serves the default page rather than failing the request.

## Flags inside pages (Cache Components)

The kit enables [Cache Components](https://nextjs.org/docs/app/getting-started/caching) (`cacheComponents: true`). Two ways of using a flag inside a page are shown, and the difference is *when* the variation is known.

**Known at build time, per route** (`components/variation-card.tsx`): because every variation is its own route, `/` renders `<VariationCard variationKey="off" />` and `/new-home-page` renders `<VariationCard variationKey="on" />` with a literal prop. The component is `"use cache"`, so it runs at build time (and on revalidation, per its `cacheLife`), its output is part of the route's static shell and is served from the CDN. Any fetching of variation-specific content belongs here; it never runs per request. This is the pattern to prefer whenever the middleware can route by variation.

**Known at request time** (`components/visitor-info.tsx`): data that is different for every visitor, such as the visitor code or the Engine.js tracking code, is read from the request headers the middleware forwarded. A flag that changes part of a page that can't be split by route is handled the same way: forward its variation key as a header from the middleware and read it here. These rules apply:

- Read request data (`headers()`, `cookies()`) in an **uncached** Server Component inside `<Suspense>`. Without the boundary the build reports a blocking route.
- To cache UI that depends on such data, pass the value (the variation key, say) as a **prop** into a `"use cache"` component. It becomes part of the cache key, so each variation is cached separately. On serverless the default cache is per instance, so expect re-renders on cold instances; `"use cache: remote"` makes it durable.
- Never call the SDK, `headers()` or `cookies()` **inside** a `"use cache"` function. The result would be cached for every visitor, and nothing warns you.
- Generate visitor codes in the middleware, not during render. The SDK uses randomness to create them, which Cache Components flag during prerendering, and `cookies().set()` is not allowed while rendering.

Both pages build as **Partial Prerender**: static shell (including the variation card) on the CDN, visitor info streamed in.

## Edge runtime vs. proxy

Next.js 16 deprecates the `middleware.ts` file name in favour of `proxy.ts`, which runs on the Node.js runtime only. The [upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16#middleware-to-proxy) is explicit: *"If you want to continue using the edge runtime, keep using middleware. We will follow up on a minor release with further edge runtime instructions."*

Flag evaluation is an edge workload: a routing decision made from a locally replicated store, in the point of presence closest to the visitor. Running it in a single Node.js region would add a cross-region round trip to every page view, so this kit keeps `middleware.ts` and accepts the deprecation warning at build time. When Next.js ships the Edge story for proxy, the code (Web APIs only) will move with a rename.

If your project has already standardized on `proxy.ts`:

```bash
git mv middleware.ts proxy.ts
```

and rename the exported function to `proxy`. Everything else, including Global Config and `event.waitUntil()`, works the same on the Node.js runtime; the SDK's full Node.js build is used there instead of its edge build.

## Set up Kameleoon

### Create a feature flag

1. Go to the `Feature flags` dashboard and click `New feature flag`.
2. Name it `new_home_page`, select the site and click `Validate`.
3. Save. The flag comes with two variations: `Off` (the current home page) and `On` (the new one); the middleware routes on the variation key, no variable is needed.

### Create a targeted delivery rule

1. In `Production`, click `Add a rule` and select `Targeted Delivery`.
   ![rule creation](docs/rule-creation.png)
2. Set `Variation to serve` to `On` and the exposition to `50%`.
   ![targeted delivery rule](docs/targeted-rule.png)
3. Save.
4. Enable the feature flag.
   ![toggle on](docs/toggle.png)

Half of the visitors now get the new home page; clear the `kameleoonVisitorCode` cookie to be re-bucketed.

## Project layout

```
middleware.ts              flag evaluation, rewrite, cookie, tracking (Edge runtime)
lib/constants.ts           credentials (from env vars), data file source, forwarded header names
lib/requester.ts           configuration from Global Config or the Kameleoon CDN, the rest over fetch
lib/eventSource.ts         no-op (no SSE in an isolate)
lib/visitorCodeManager.ts  visitor code cookie in request / response headers
app/page.tsx, app/new-home-page/   the two variations, static
components/variation-card.tsx      variation UI cached at build time, per route
components/visitor-info.tsx        per-visitor data read from the middleware's headers
```
