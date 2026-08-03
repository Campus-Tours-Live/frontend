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

/** Public R2 bucket holding the 50 state flags plus the District of Columbia. Separate from the
 *  app-asset bucket above; overridable the same way for a future CDN domain. */
const DEFAULT_FLAGS_BASE = "https://pub-bc90afbcddd941ac9f960a2a22a522a5.r2.dev";

const FLAGS_BASE = (process.env.NEXT_PUBLIC_FLAGS_BASE_URL ?? DEFAULT_FLAGS_BASE).replace(
  /\/+$/,
  "",
);

/**
 * URL for a state flag, routed through Next's image optimizer.
 *
 * The originals are ~1536×1024 PNGs at roughly 2 MB each — 84 MB for the set. The map shows one at
 * a time, clipped inside a state outline a few hundred pixels wide at most, so handing over the
 * original would cost megabytes per hover for pixels nobody sees. `/_next/image` re-encodes to
 * WebP/AVIF at the requested width and caches the result, which is why the bucket host is
 * allow-listed in `next.config.ts`.
 *
 * Files are named after the state with underscores for spaces: `New_Hampshire.png`,
 * `District_of_Columbia.png`.
 *
 * @param stateName Full name, e.g. "New Hampshire".
 * @param width Rendered width to optimize for. Must be one of Next's configured sizes.
 */
export function stateFlagUrl(stateName: string, width = 384): string {
  const file = `${stateName.replace(/\s+/g, "_")}.png`;
  return `/_next/image?url=${encodeURIComponent(`${FLAGS_BASE}/${file}`)}&w=${width}&q=70`;
}
