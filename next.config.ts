import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 rendering model: every route produces a static shell,
  // per-visitor content streams behind <Suspense>. See README "Flags inside pages".
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
