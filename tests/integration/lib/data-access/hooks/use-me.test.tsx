import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMe } from "@/lib/data-access/hooks/use-me";
import { MeHydration } from "@/lib/data-access/MeHydration";
import type { Me } from "@/lib/data-access/types";
import { pendingMe, provisionedMe } from "../../../../support/meFixtures";

/**
 * Exercises the REAL useMe hook end-to-end. It is two-phase: GET /auth/session (always 200,
 * { authenticated }) decides whether to then read the PROTECTED /v1/userinfo for roles — so a
 * logged-out visitor never calls /v1/userinfo. Only global.fetch is mocked.
 */

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** A minimal Response stand-in matching what apiFetch/apiJson read. */
function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    body: null,
    json: async () => body,
  } as unknown as Response;
}

const fetchMock = jest.fn();

/** Route fetches by path: /auth/session → { authenticated }, /v1/userinfo → the given response. */
function routeFetch(opts: { authenticated?: boolean; userinfo?: () => Response }) {
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/auth/session")) {
      return Promise.resolve(jsonResponse(200, { authenticated: opts.authenticated ?? false }));
    }
    if (url.includes("/v1/userinfo")) {
      return Promise.resolve(opts.userinfo ? opts.userinfo() : jsonResponse(401, {}));
    }
    return Promise.resolve(jsonResponse(404, {}));
  });
}

const userinfoCalls = () =>
  fetchMock.mock.calls.filter(([input]) => String(input).includes("/v1/userinfo"));

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("useMe", () => {
  it("reads /v1/userinfo with same-origin credentials once the session is authenticated", async () => {
    routeFetch({
      authenticated: true,
      userinfo: () =>
        jsonResponse(200, {
          data: provisionedMe({ id: "u1", roles: ["PARTICIPANT"], currentRole: "PARTICIPANT" }),
        }),
    });

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.me).not.toBeNull());

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/userinfo",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  /**
   * LOAD-BEARING (N3 re-checked this). `fetchMe`'s catch for a plain 401 is unreachable in
   * production for this endpoint — the BFF's only 401 emitter is `_shared/reauth.ts`, which
   * always sets `Auth-Required`. So the entire guarantee that an anonymous visitor never
   * touches the protected principal read rests on THIS gate, not on that catch. Keep this
   * test alive through any refactor of useMe.
   */
  it("logged out (session says no) → me null AND never calls the protected /v1/userinfo", async () => {
    routeFetch({ authenticated: false });

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.me).toBeNull();
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.hasRole("PARTICIPANT")).toBe(false);
    // The whole point: a public / logged-out page must not touch the login-required endpoint.
    expect(userinfoCalls()).toHaveLength(0);
  });

  it("is loading initially with no data", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // session never resolves

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.me).toBeNull();
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.hasRole("PARTICIPANT")).toBe(false);
  });

  it("an authenticated user with roles → me populated, isOnboarded true, hasRole correct", async () => {
    routeFetch({
      authenticated: true,
      userinfo: () =>
        jsonResponse(200, {
          data: provisionedMe({ id: "u1", roles: ["PARTICIPANT", "GUIDE"], currentRole: "GUIDE" }),
        }),
    });

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.me).toMatchObject({ user: { id: "u1" }, currentRole: "GUIDE" });
    expect(result.current.isOnboarded).toBe(true);
    expect(result.current.hasRole("PARTICIPANT")).toBe(true);
    expect(result.current.hasRole("GUIDE")).toBe(true);
    expect(result.current.hasRole("ADMIN")).toBe(false);
  });

  it("unwraps a bare (non-enveloped) userinfo body too", async () => {
    routeFetch({
      authenticated: true,
      userinfo: () =>
        jsonResponse(200, provisionedMe({ id: "u2", roles: ["GUIDE"], currentRole: "GUIDE" })),
    });

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.me).not.toBeNull());

    expect(result.current.me?.user.id).toBe("u2");
    expect(result.current.hasRole("GUIDE")).toBe(true);
  });

  /**
   * NOTE — this drives a 401 WITHOUT `Auth-Required`, which the BFF cannot actually produce
   * for this endpoint (see the comment above). The old name, "session/token race", implied
   * the real mid-session race is silent; it is not — that race always carries the re-auth
   * header, and N3 surfaces it through the session-expired banner (me-ambient.test.ts).
   * What this pins is only the defensive branch: an unexpected bare 401 degrades to
   * logged-out rather than throwing.
   */
  it("session authenticated but a bare 401 (no Auth-Required) → me null, defensively", async () => {
    routeFetch({ authenticated: true, userinfo: () => jsonResponse(401, {}) });

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.me).toBeNull();
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.hasRole("PARTICIPANT")).toBe(false);
  });

  it("PENDING (no roles yet) → onboarded false even though me is present — gated on provisioningStatus, not roles.length", async () => {
    routeFetch({
      authenticated: true,
      userinfo: () => jsonResponse(200, { data: pendingMe() }),
    });

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.me).toMatchObject({ provisioningStatus: "PENDING" });
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.hasRole("PARTICIPANT")).toBe(false);
  });
});

/**
 * The point of `MeHydration`: an RSC guard has already paid for `/v1/userinfo`, so the client
 * must not pay again. Every test above proves useMe FETCHES; these prove it does NOT when the
 * server seeded the cache — the same hook, the same two-phase logic, zero requests.
 *
 * `staleTime` matches `QueryProvider`'s 30s, because that is what makes seeded entries count as
 * fresh. Without it React Query treats hydrated data as immediately stale and refetches, which
 * would leave the round-trips in place while every other assertion still passed.
 */
describe("useMe with an RSC-seeded cache (MeHydration)", () => {
  function makeHydratedWrapper(me: Me) {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: false } },
    });
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={client}>
          <MeHydration me={me}>{children}</MeHydration>
        </QueryClientProvider>
      );
    };
  }

  it("issues NO request — not /auth/session, not /v1/userinfo — for a seeded PENDING principal", async () => {
    // Both routes are wired to succeed, so a passing test means the hook chose not to call
    // them, never that a call failed silently.
    routeFetch({ authenticated: true, userinfo: () => jsonResponse(200, { data: pendingMe() }) });
    const me = pendingMe({ email: "first.timer@example.com" });

    const { result } = renderHook(() => useMe(), { wrapper: makeHydratedWrapper(me) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.me).toEqual(me);
    expect(result.current.isOnboarded).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("issues NO request for a seeded PROVISIONED principal, and still derives roles correctly", async () => {
    routeFetch({ authenticated: true, userinfo: () => jsonResponse(200, { data: pendingMe() }) });
    const me = provisionedMe({ roles: ["PARTICIPANT"], currentRole: "PARTICIPANT" });

    const { result } = renderHook(() => useMe(), { wrapper: makeHydratedWrapper(me) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isOnboarded).toBe(true);
    expect(result.current.hasRole("PARTICIPANT")).toBe(true);
    expect(result.current.hasRole("GUIDE")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
