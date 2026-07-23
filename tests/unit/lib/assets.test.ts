import { assetUrl } from "@/lib/assets";

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
