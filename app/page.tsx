import { Suspense } from "react";
import Explanation from "@/components/explanation";
import VariationCard from "@/components/variation-card";
import VisitorInfo from "@/components/visitor-info";

// No request data is read here, so this page is prerendered into a static
// shell at build time and served from the CDN. The middleware decides who sees it.
export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">HOME PAGE</h1>
        <p>This page is the default version of the home page.</p>
        <p>
          You are seeing this version because the feature flag with the{" "}
          <b>new_home_page</b> feature key is disabled, or you are not targeted.
        </p>
      </section>

      {/* Variation is a fact of this route: cached at build time, served from the CDN */}
      <VariationCard variationKey="off" />

      {/* Per-visitor data: streams in behind the static shell */}
      <Suspense fallback={<p className="text-xs text-zinc-500">Loading…</p>}>
        <VisitorInfo />
      </Suspense>

      <Explanation />
    </div>
  );
}
