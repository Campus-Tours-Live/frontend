import { ApiError } from "@/lib/data-access";
import { retryDelayMs, shouldRetry } from "@/lib/data-access/QueryProvider";
import { AuthCancelledError } from "@/lib/auth";

/**
 * N3 — reconcile the client's retry pace with N2's `Retry-After`.
 *
 * N2 answers `503 AUTH_UPSTREAM_UNAVAILABLE` with `Retry-After: 5` precisely because Google
 * is struggling. Retrying on the client's own ~1s backoff would mean that during a Google
 * incident every browser retries harder than the server asked, adding load to the outage
 * that caused it.
 */
describe("ApiError carries Retry-After", () => {
  it("parses seconds into milliseconds", () => {
    const err = new ApiError(503, "unavailable", "AUTH_UPSTREAM_UNAVAILABLE", 5000);
    expect(err.retryAfterMs).toBe(5000);
    expect(err.code).toBe("AUTH_UPSTREAM_UNAVAILABLE");
  });
});

describe("retryDelayMs", () => {
  it("uses the server's pace when it asked for one", () => {
    const err = new ApiError(503, "unavailable", "AUTH_UPSTREAM_UNAVAILABLE", 5000);
    expect(retryDelayMs(0, err)).toBe(5000);
    // Still the server's pace on later attempts — it asked, we don't renegotiate.
    expect(retryDelayMs(3, err)).toBe(5000);
  });

  it("falls back to exponential backoff when the server said nothing", () => {
    expect(retryDelayMs(0, new ApiError(500, "boom"))).toBe(1000);
    expect(retryDelayMs(1, new ApiError(500, "boom"))).toBe(2000);
    expect(retryDelayMs(0, new Error("network"))).toBe(1000);
  });

  it("caps the fallback so a long outage can't schedule an absurd delay", () => {
    expect(retryDelayMs(20, new Error("network"))).toBe(30_000);
  });
});

describe("shouldRetry", () => {
  it("never retries a cancelled sign-in", () => {
    expect(shouldRetry(0, new AuthCancelledError())).toBe(false);
  });

  it("never retries a 4xx — the request was wrong, not unlucky", () => {
    expect(shouldRetry(0, new ApiError(422, "invalid"))).toBe(false);
  });

  it("retries a transient failure exactly once", () => {
    expect(shouldRetry(0, new ApiError(503, "unavailable"))).toBe(true);
    expect(shouldRetry(1, new ApiError(503, "unavailable"))).toBe(false);
  });
});

describe("Retry-After parsing (via a real response)", () => {
  const { apiJson } =
    jest.requireActual<typeof import("@/lib/data-access/http")>("@/lib/data-access/http");

  const setFetch = (r: Response) => {
    global.fetch = jest.fn().mockResolvedValue(r) as unknown as typeof fetch;
  };

  function res(headers: Record<string, string>): Response {
    const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    return {
      ok: false,
      status: 503,
      headers: { get: (n: string) => map.get(n.toLowerCase()) ?? null },
      json: async () => ({ title: "unavailable", code: "AUTH_UPSTREAM_UNAVAILABLE" }),
    } as unknown as Response;
  }

  it("reads a numeric Retry-After", async () => {
    setFetch(res({ "Retry-After": "5" }));
    await expect(apiJson("/v1/userinfo")).rejects.toMatchObject({ retryAfterMs: 5000 });
  });

  it("leaves it undefined when the header is absent", async () => {
    setFetch(res({}));
    await expect(apiJson("/v1/userinfo")).rejects.toMatchObject({ retryAfterMs: undefined });
  });

  it("ignores a non-numeric Retry-After (an HTTP-date form we do not honour)", async () => {
    setFetch(res({ "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" }));
    await expect(apiJson("/v1/userinfo")).rejects.toMatchObject({ retryAfterMs: undefined });
  });
});
