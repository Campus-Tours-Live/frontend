import type { NextConfig } from "next";

/**
 * Guards the last hop of spec CTL-97's invariant I6.
 *
 * `GET /v1/meta/enrollment-years` carries a `Cache-Control` whose `max-age` Core computes to
 * expire when the server's year rolls over. Core sets it, the BFF relays it verbatim, and this
 * app's `/v1/:path*` rewrite is the final hop before the browser. Next's proxy copies upstream
 * response headers through untouched, so the chain works today — but nothing in EITHER repo
 * asserted the frontend end of it, which is how two prior reviews came to flag this hop as
 * "verified by reading node_modules, owned by nobody".
 *
 * These tests pin the two things that are actually checkable from config: that the `/v1` rewrite
 * still points at the BFF, and that no `headers()` rule has appeared to stamp a constant
 * `Cache-Control` over the computed one. The second is the realistic regression — adding a
 * caching header rule is an ordinary-looking change that would silently pin clients to a stale
 * year window for up to a day.
 *
 * What this canNOT check: whether Next's proxy implementation still forwards response headers.
 * That lives in `next` itself and would change under a major upgrade. If I6 ever misbehaves after
 * a Next upgrade, that is the thing to re-verify.
 */
async function loadConfig(bffUrl?: string): Promise<NextConfig> {
  const previous = process.env.BFF_URL;
  if (bffUrl === undefined) delete process.env.BFF_URL;
  else process.env.BFF_URL = bffUrl;

  let config: NextConfig;
  try {
    // The config reads process.env at module scope, so it must be re-imported per case.
    jest.resetModules();
    config = (await import("../../next.config")).default;
  } finally {
    if (previous === undefined) delete process.env.BFF_URL;
    else process.env.BFF_URL = previous;
  }
  return config;
}

describe("next.config rewrites — I6's last hop", () => {
  it("proxies /v1/* to the BFF when BFF_URL is set", async () => {
    const config = await loadConfig("http://localhost:4000");
    const rewrites = await config.rewrites!();

    // The object form: { beforeFiles, afterFiles, fallback }.
    const beforeFiles = (rewrites as { beforeFiles: { source: string; destination: string }[] })
      .beforeFiles;

    expect(beforeFiles).toContainEqual({
      source: "/v1/:path*",
      destination: "http://localhost:4000/v1/:path*",
    });
  });

  /**
   * The regression this file exists for. A `headers()` rule matching `/v1/*` would stamp a
   * constant `Cache-Control` over the one Core computed, and clients would validate against last
   * year's window. Asserting `headers` is absent entirely is deliberately stricter than asserting
   * "no rule matches /v1": a narrower check invites someone to add a rule with a source that
   * matches `/v1` in a way a simple string comparison misses.
   */
  it("defines no headers() rule that could override the computed Cache-Control", async () => {
    const config = await loadConfig("http://localhost:4000");
    expect(config.headers).toBeUndefined();
  });

  it("proxies nothing when BFF_URL is unset, so local routes serve", async () => {
    const config = await loadConfig(undefined);
    const rewrites = await config.rewrites!();
    const beforeFiles = (rewrites as { beforeFiles: unknown[] }).beforeFiles;

    expect(beforeFiles).toEqual([]);
  });
});
