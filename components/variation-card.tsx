import { cacheLife } from "next/cache";

/**
 * Variation-specific UI, cached per variation.
 *
 * Each route renders it with a literal `variationKey` ("off" on `/`, "on" on
 * `/new-home-page`), so the prop is known at build time: the cached output
 * becomes part of the route's static shell and is served from the CDN. No
 * request data is read, so no <Suspense> is needed around it.
 *
 * With `use cache`, any async work in here (fetching variation-specific
 * content, say) runs at build time and on revalidation, not per request.
 */
export default async function VariationCard({
  variationKey,
}: {
  variationKey: "on" | "off";
}) {
  "use cache";
  cacheLife("hours");

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-semibold">
        Variation <code>{variationKey}</code>
      </h2>
      <p className="mt-2 text-sm text-zinc-600">
        This card is a <code>&quot;use cache&quot;</code> component rendered
        with a fixed variation per route. It was rendered at{" "}
        <time>{new Date().toISOString()}</time>, at build time or on the last
        revalidation, and is served from the CDN as part of the static page.
      </p>
    </section>
  );
}
