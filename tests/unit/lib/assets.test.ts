import { assetUrl, stateFlagUrl } from "@/lib/assets";

const DEFAULT_BASE = "https://pub-211d5907b19d42af9733080e09f8ebbb.r2.dev";

describe("assetUrl", () => {
  it("builds a root-level URL on the public R2 bucket by default", () => {
    expect(assetUrl("hero_campus.png")).toBe(`${DEFAULT_BASE}/hero_campus.png`);
  });

  it("tolerates a leading slash in the key", () => {
    expect(assetUrl("/logo.svg")).toBe(`${DEFAULT_BASE}/logo.svg`);
  });

  it("honours NEXT_PUBLIC_ASSETS_BASE_URL (trailing slash trimmed) when set", async () => {
    const prev = process.env.NEXT_PUBLIC_ASSETS_BASE_URL;
    process.env.NEXT_PUBLIC_ASSETS_BASE_URL = "https://cdn.example.com/";
    jest.resetModules();
    try {
      const { assetUrl: fresh } = await import("@/lib/assets");
      expect(fresh("hero_campus.png")).toBe("https://cdn.example.com/hero_campus.png");
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_ASSETS_BASE_URL;
      else process.env.NEXT_PUBLIC_ASSETS_BASE_URL = prev;
      jest.resetModules();
    }
  });
});

describe("stateFlagUrl", () => {
  /**
   * The flag originals are ~1536×1024 PNGs at roughly 2 MB each — 84 MB for the set. The map shows
   * one at a time, clipped into a state outline a few hundred pixels wide, so routing through the
   * optimizer is the whole point: measured live at 2,149,108 bytes raw versus 5,886 as WebP.
   */
  it("routes through Next's image optimizer with a sane width and quality", () => {
    const url = stateFlagUrl("Texas");
    expect(url.startsWith("/_next/image?")).toBe(true);
    expect(url).toContain("w=384");
    expect(url).toContain("q=70");
  });

  it("underscores spaces to match the bucket's filenames", () => {
    expect(decodeURIComponent(stateFlagUrl("New Hampshire"))).toContain("/New_Hampshire.png");
    expect(decodeURIComponent(stateFlagUrl("District of Columbia"))).toContain(
      "/District_of_Columbia.png",
    );
    expect(decodeURIComponent(stateFlagUrl("Ohio"))).toContain("/Ohio.png");
  });

  /** The upstream URL is a query parameter, so it has to survive encoding intact. */
  it("encodes the upstream URL so the optimizer receives it whole", () => {
    const url = stateFlagUrl("California");
    expect(url).toContain("url=https%3A%2F%2F");
    expect(decodeURIComponent(url)).toContain("https://");
  });

  it("accepts an explicit width for larger renders", () => {
    expect(stateFlagUrl("Utah", 640)).toContain("w=640");
  });
});
