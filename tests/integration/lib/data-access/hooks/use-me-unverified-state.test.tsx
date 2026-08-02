import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMe } from "@/lib/data-access";
import { clearAuthNotice, resetAuthGate } from "@/lib/auth";
import { provisionedMe } from "../../../../support/meFixtures";

/**
 * "Still loading" and "we could not check" are DIFFERENT states, and folding the second into
 * the first was a mistake with a real cost.
 *
 * The first fix for the cold-start contradiction reported the unverifiable case as
 * `isLoading: true`. That reads correctly in the header (it renders no identity and no
 * sign-out affordance), but `/profile` does `if (isLoading) return <InlineLoading/>` — so
 * during a sustained Google outage a protected page span forever, under a banner explaining
 * that we cannot verify the session. An indefinite spinner is a worse lie than either truth.
 *
 * A timeout would not fix this: after N seconds we still do not know, and there is no honest
 * state to fall back TO — "signed out" is false, and that false sign-out is the original M4
 * symptom. The answer is to stop conflating the two states and let each consumer decide.
 *
 * Scope of the gap: only the COLD START. With a cached principal N3's rethrow already keeps
 * the last good `data`, so the header stays signed-in; this arises when the user opens the
 * app during the outage with a token inside the 5-minute refresh window, so there is no
 * cached `me` at all. (Absorbed from use-me-unverified.test.tsx, which this file supersedes:
 * every case there is covered below with a sharper assertion.)
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

function routeFetch(userinfo: () => Response) {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/auth/session")) return jsonResponse(200, { authenticated: true });
    return userinfo();
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  resetAuthGate();
  clearAuthNotice();
});

describe("useMe exposes 'could not verify' as its own state", () => {
  it("reports sessionUnverified, and does NOT pretend to still be loading", async () => {
    routeFetch(() => jsonResponse(503, UNVERIFIABLE));

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.sessionUnverified).toBe(true));

    // The distinction that keeps /profile from spinning forever.
    expect(result.current.isLoading).toBe(false);
    // And still not a claim that the user is signed out.
    expect(result.current.me).toBeNull();
    expect(result.current.isOnboarded).toBe(false);
  });

  it("is false for a real signed-out answer", async () => {
    routeFetch(() => jsonResponse(401, {}));

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sessionUnverified).toBe(false);
  });

  it("is false once a principal is cached, even if a later read cannot verify", async () => {
    let attempt = 0;
    routeFetch(() => {
      attempt += 1;
      return attempt === 1
        ? jsonResponse(200, { data: provisionedMe({ id: "u1", roles: ["GUIDE"] }) })
        : jsonResponse(503, UNVERIFIABLE);
    });

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.me?.user.id).toBe("u1"));

    // We know who they are; nothing is unverified from the UI's point of view.
    expect(result.current.sessionUnverified).toBe(false);
    expect(result.current.isOnboarded).toBe(true);
  });
});
