import {
  KameleoonClient,
  KameleoonError,
  KameleoonException,
  Variation,
} from "@kameleoon/nodejs-sdk";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { VercelVisitorCodeManager } from "@/lib/visitorCodeManager";
import { VercelEventSource } from "@/lib/eventSource";
import { VercelRequester } from "@/lib/requester";
import {
  CLIENT_ID,
  CLIENT_SECRET,
  KAMELEOON_HEADERS,
  SITE_CODE,
} from "@/lib/constants";

// Feature flag from the README walkthrough, replace with your own.
const FEATURE_KEY = "new_home_page";

// The recommended setup is to keep tracking disabled in the middleware and send
// tracking events via Engine.js or JS/React SDK instead.
const TRACK_IN_MIDDLEWARE = false;

// Edge isolates keep the SDK configuration they loaded at startup. With this
// enabled every request calls `refreshDataFileIfStale()` in the background, so
// isolates pick up configuration changes (a disabled flag, say) within
// DATAFILE_UPDATE_INTERVAL_MINUTES. With Global Config a refresh is a local
// read of about a millisecond.
const ENABLE_DATAFILE_REFRESH = true;
const DATAFILE_UPDATE_INTERVAL_MINUTES = ENABLE_DATAFILE_REFRESH ? 1 : 60;

// Paths to run the middleware on. Next.js parses `matcher` at build time, so
// it must be a literal. `middleware.ts` runs on the Edge runtime; Next.js 16
// deprecates the file name in favour of `proxy.ts` (Node.js only), see
// README "Edge runtime vs. proxy".
export const config = {
  matcher: ["/", "/new-home-page"],
};

// Reuse the SDK client across requests while the edge isolate stays alive.
let client: KameleoonClient;
let isInitialized = false;

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  try {
    return await handleRequest(request, event);
  } catch (error) {
    // Never block the page on an experimentation failure: serve the default page
    console.error("[KAMELEOON] Falling back to the default page", error);
    return rewrite(request, "/");
  }
}

async function handleRequest(request: NextRequest, event: NextFetchEvent) {
  // Create the SDK client once and keep the external integrations edge-safe.
  if (!client) {
    client = new KameleoonClient({
      siteCode: SITE_CODE,
      credentials: {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
      },
      configuration: {
        dataFileRefreshInterval: DATAFILE_UPDATE_INTERVAL_MINUTES,
      },
      externals: {
        requester: new VercelRequester(),
        eventSource: new VercelEventSource(),
        visitorCodeManager: new VercelVisitorCodeManager(),
      },
    });
  }

  // Initialize the client before using the methods
  if (!isInitialized) {
    isInitialized = await client.initialize();
  }

  // Headers the response is created with (the rewrite target isn't known yet)
  const responseHeaders = new Headers();

  // Read the visitor code from the incoming cookies or create one if needed.
  // The cookie is written to `responseHeaders` so the decision sticks for this browser.
  const visitorCode = client.getVisitorCode({
    input: request.headers,
    output: responseHeaders,
  });

  // Prefetches are routed like any request (so the prefetched page is the
  // right variation) but are not a page view: don't count them as exposures.
  const track = TRACK_IN_MIDDLEWARE && !isPrefetch(request);

  // Evaluate the visitor against the feature flag that picks the page.
  const variation = getVariation(visitorCode, track);

  // Variation "on" gets the new page, anything else (off, untargeted, flag
  // disabled or missing) the default. The visitor keeps the requested URL,
  // the CDN serves the variant's static page.
  const pathname = variation?.key === "on" ? "/new-home-page" : "/";

  // Forwarded to Server Components as request headers, see components/visitor-info.tsx
  const forwardedHeaders: Record<string, string> = {
    [KAMELEOON_HEADERS.visitorCode]: visitorCode,
  };

  // If middleware-side tracking is enabled, flush events in the background so
  // the response is not blocked. The recommended approach is to track via Engine.js
  // instead and use the generated tracking code in your page or app.
  if (TRACK_IN_MIDDLEWARE) {
    if (track) {
      event.waitUntil(client.flushInstant(visitorCode));
    }
  } else {
    const engineCode = client.getEngineTrackingCode(visitorCode);
    // Please follow the method description at:
    // https://developers.kameleoon.com/feature-management-and-experimentation/web-sdks/nodejs-sdk/#getenginetrackingcode
    forwardedHeaders[KAMELEOON_HEADERS.engineTrackingCode] = engineCode;
  }

  const response = rewrite(request, pathname, forwardedHeaders, responseHeaders);

  // Call `refreshDataFileIfStale()` only when you need isolates to pick up
  // fresh configuration without waiting for the next isolate restart.
  if (ENABLE_DATAFILE_REFRESH) {
    event.waitUntil(client.refreshDataFileIfStale());
  }

  return response;
}

// `null` when the flag is unknown to the configuration or disabled in this
// environment, so those cases serve the default page without an error.
function getVariation(visitorCode: string, track: boolean): Variation | null {
  try {
    return client.getVariation({ visitorCode, featureKey: FEATURE_KEY, track });
  } catch (error) {
    if (
      error instanceof KameleoonError &&
      (error.type === KameleoonException.FeatureFlagConfigurationNotFound ||
        error.type === KameleoonException.FeatureFlagEnvironmentDisabled)
    ) {
      return null;
    }

    throw error;
  }
}

// Browser prefetches (`<link rel="prefetch">`, speculation rules) announce
// themselves with these headers. Next.js router prefetches don't reach the
// middleware with theirs (`next-router-prefetch` is stripped) unless
// `skipProxyUrlNormalize: true` is set in next.config.ts, see README.
function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch") === true
  );
}

function rewrite(
  request: NextRequest,
  pathname: string,
  requestHeaders: Record<string, string> = {},
  responseHeaders?: Headers,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;

  // Only the middleware sets the Kameleoon headers: drop any sent by the client
  const headers = new Headers(request.headers);
  for (const name of Object.values(KAMELEOON_HEADERS)) {
    headers.delete(name);
  }
  for (const [name, value] of Object.entries(requestHeaders)) {
    headers.set(name, value);
  }

  return NextResponse.rewrite(url, {
    headers: responseHeaders,
    request: { headers },
  });
}
