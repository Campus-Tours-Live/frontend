import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMe } from "@/lib/data-access";
import { clearAuthNotice, resetAuthGate } from "@/lib/auth";

/**
 * N3 review follow-up — "we couldn't check" must not render as "you are signed out".
 *
 * With a cached principal, N3's rethrow already does the right thing: React Query keeps the
 * last good `data`, so the header stays signed-in. The gap is the COLD START — the user
 * opens the app during a Google outage with a token inside the 5-minute refresh window, so
 * there is no cached `me` at all. Then `data` is undefined, `me` falls to null,
 * `isOnboarded` is false, and — because the query has errored rather than settled —
 * `isLoading` is false too, so the header renders its signed-out state while the banner
 * says "you're still signed in".
 *
 * The honest state there is neither "signed in" nor "signed out": we do not know yet. So it
 * reports as still-resolving, and the header shows neither identity nor a sign-out affordance.
 */
function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    body: { cancel: jest.fn().mockResolvedValue(undefined) },
    json: async () => body,
  } as unknown as Response;
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const UNVERIFIABLE = { code: "AUTH_UPSTREAM_UNAVAILABLE", title: "Sign-in service unavailable" };

beforeEach(() => {
  resetAuthGate();
  clearAuthNotice();
});

describe("useMe — session cannot be verified, cold start", () => {
  it("does NOT report a signed-out principal when we simply could not check", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/session")) return jsonResponse(200, { authenticated: true });
      return jsonResponse(503, UNVERIFIABLE);
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.me).toBeNull());

    // Unresolved, not signed out — this is what stops HeaderNav rendering the logged-out
    // state underneath a banner that says the user is still signed in.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isOnboarded).toBe(false);
  });

  it("settles to signed-out for a real 401, not this", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/session")) return jsonResponse(200, { authenticated: true });
      return jsonResponse(401, {});
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.me).toBeNull();
  });

  it("keeps a cached principal when a later refetch cannot verify", async () => {
    let attempt = 0;
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/session")) return jsonResponse(200, { authenticated: true });
      attempt += 1;
      return attempt === 1
        ? jsonResponse(200, { data: { id: "u1", roles: ["GUIDE"] } })
        : jsonResponse(503, UNVERIFIABLE);
    }) as unknown as typeof fetch;

    const wrapper = makeWrapper();
    const { result } = renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(result.current.me?.id).toBe("u1"));

    // The warm path N3 already handled: the last good principal survives the failure.
    expect(result.current.isOnboarded).toBe(true);
  });
});
