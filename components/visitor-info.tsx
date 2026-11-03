import { headers } from "next/headers";
import { KAMELEOON_HEADERS } from "@/lib/constants";

/**
 * The per-visitor part of the page: the middleware forwarded the visitor code and
 * the Engine.js tracking code as request headers, and this uncached component
 * reads them. `headers()` is request data, so the page renders this inside
 * <Suspense>: the static shell ships first, this streams in after.
 *
 * When a flag has to change part of a page that can't be split by route,
 * read the variation key here the same way and pass it as a prop to a
 * `use cache` component. Never call the SDK or read headers/cookies inside
 * a `use cache` function: the result would be cached for every visitor.
 */
export default async function VisitorInfo() {
  const requestHeaders = await headers();
  const visitorCode = requestHeaders.get(KAMELEOON_HEADERS.visitorCode);
  const engineTrackingCode = requestHeaders.get(
    KAMELEOON_HEADERS.engineTrackingCode,
  );

  if (!visitorCode) {
    return null;
  }

  return (
    <section className="text-xs text-zinc-500">
      <p>
        Visitor code: <code>{visitorCode}</code> (from the{" "}
        <code>kameleoonVisitorCode</code> cookie, set by the middleware)
      </p>
      {engineTrackingCode && (
        <>
          {/* Hybrid tracking: queued for Engine.js, which reports the exposure.
              Harmless when Engine.js isn't installed on the page. */}
          <script dangerouslySetInnerHTML={{ __html: engineTrackingCode }} />
          <p className="mt-1">
            Engine.js tracking code: <code>{engineTrackingCode}</code>
          </p>
        </>
      )}
    </section>
  );
}
