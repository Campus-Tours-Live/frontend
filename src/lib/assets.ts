// Static app images live in a public Cloudflare R2 bucket (root-level keys), NOT in /public — see
// docs .../meta-... plan family and next.config's images.remotePatterns allow-list. Build URLs
// through assetUrl() so the host is defined in one place and can move to a custom domain later by
// setting NEXT_PUBLIC_ASSETS_BASE_URL, with zero other code changes.

/** Public R2 bucket serving the app's static images. Overridable per environment (e.g. a future
 *  custom CDN domain) via NEXT_PUBLIC_ASSETS_BASE_URL; the baked default keeps dev/CI zero-config. */
const DEFAULT_BASE = "https://pub-211d5907b19d42af9733080e09f8ebbb.r2.dev";

const BASE = (process.env.NEXT_PUBLIC_ASSETS_BASE_URL ?? DEFAULT_BASE).replace(/\/+$/, "");

/** Absolute URL for a static asset by its bucket key (root-level), e.g. assetUrl("hero_campus.png"). */
export function assetUrl(file: string): string {
  return `${BASE}/${file.replace(/^\/+/, "")}`;
}
