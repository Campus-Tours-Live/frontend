import type { NextConfig } from "next";

// Optional BFF origin. When set, /auth/*, /api/* and /v1/* are proxied to the BFF so
// the browser stays same-origin (cookies/session) while the BFF handles Google sign-in.
const BFF_URL = process.env.BFF_URL;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Remote images served from public Cloudflare R2 buckets — next/image only optimizes hosts
  // explicitly allow-listed here.
  images: {
    remotePatterns: [
      // University campus photos (backend-provided tour.universityImageUrl).
      { protocol: "https", hostname: "pub-3225b84a9a0b4728b11f261ee52251ba.r2.dev" },
      // Static app assets (hero/signup/logo images — see @/lib/assets).
      { protocol: "https", hostname: "pub-211d5907b19d42af9733080e09f8ebbb.r2.dev" },
      // State flags for the interactive US map (see @/lib/assets → stateFlagUrl). Allow-listed so
      // the optimizer can serve them: the originals are ~2 MB each, which is far too heavy to hand
      // to the browser on hover.
      { protocol: "https", hostname: "pub-bc90afbcddd941ac9f960a2a22a522a5.r2.dev" },
    ],
  },
  // Next.js 16 uses Turbopack by default for dev and build (Webpack-compatible,
  // Rust-based). No separate bundler (Vite/Webpack) config is required.
  // ⚠️ Do NOT add a `headers()` entry matching `/v1/:path*`, and do not wrap these rewrites in
  // anything that rewrites response headers.
  //
  // `GET /v1/meta/enrollment-years` carries a `Cache-Control` whose `max-age` is computed by Core
  // to expire exactly when the server's year rolls over (spec CTL-97, invariant I6). This rewrite
  // is the LAST hop before the browser: Core computes the age, the BFF relays it verbatim, and
  // Next hands it on untouched — verified in Next's `proxy-request.js`, which sets only
  // `x-forwarded-host` on the REQUEST and never touches the response, so http-proxy copies
  // upstream response headers through as-is.
  //
  // A `headers()` rule here would override that per-response value with a constant, and clients
  // would validate against a stale year window for up to a day. Note the failure is one-sided:
  // DROPPING the header is harmless (the browser simply revalidates more often); only LENGTHENING
  // `max-age` breaks I6. The same warning applies to any CDN or edge proxy in front of this app —
  // `/v1/meta/enrollment-years` must not have its `Cache-Control` overridden at the edge.
  //
  // `tests/unit/next-config.test.ts` pins the parts of this that are checkable in-repo.
  async rewrites() {
    // beforeFiles → proxy to the BFF *before* local routes (so the real BFF
    // overrides the dev-only /auth/login stand-in once BFF_URL is configured).
    return {
      beforeFiles: BFF_URL
        ? [
            { source: "/auth/:path*", destination: `${BFF_URL}/auth/:path*` },
            { source: "/api/:path*", destination: `${BFF_URL}/api/:path*` },
            { source: "/v1/:path*", destination: `${BFF_URL}/v1/:path*` },
          ]
        : [],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
