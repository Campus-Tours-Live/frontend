import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGateSync } from "@/components/auth/AuthGateSync";
import { queryKeys } from "@/lib/data-access/keys";
import {
  AuthCancelledError,
  cancelAuth,
  requireAuth,
  resetAuthGate,
  subscribeAuthGate,
} from "@/lib/auth";

/**
 * N1a — the client must not stay signed-in-looking after the server has said otherwise.
 *
 * The BFF's `Auth-Required: reauthenticate` response CLEARS the session cookie. Nothing on
 * the client acted on that: the cached `["session"]` stayed `true`, so the header kept
 * rendering the signed-in state indefinitely (`staleTime` marks data stale, it does not
 * refetch it, and `refetchOnWindowFocus` is off — so with the header mounted in the layout
 * and no navigation, nothing ever re-probed). Symptom B.
 *
 * This component is the missing seam: it listens on the EXISTING `subscribeAuthGate`
 * channel and transitions the cache to anonymous the moment the gate opens. It lives in the
 * component layer on purpose — `lib/auth` stays framework-agnostic and must never import a
 * QueryClient.
 */
let pathname = "/dashboard";
jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

function renderWithClient(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <AuthGateSync />
    </QueryClientProvider>,
  );
}

function makeClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(queryKeys.session(), true);
  client.setQueryData(queryKeys.me(), { id: "u1", roles: ["GUIDE"] });
  return client;
}

beforeEach(() => {
  pathname = "/dashboard";
  resetAuthGate();
});

describe("AuthGateSync — gate opening transitions the client to anonymous", () => {
  it("flips the cached session to false and drops the cached principal", () => {
    const client = makeClient();
    renderWithClient(client);

    requireAuth(); // a re-auth 401 opened the gate

    expect(client.getQueryData(queryKeys.session())).toBe(false);
    expect(client.getQueryData(queryKeys.me())).toBeUndefined();

    cancelAuth();
  });

  it("does so WITHOUT waiting for a re-probe — no staleTime, no refetch trigger", () => {
    const client = makeClient();
    renderWithClient(client);
    const fetchSpy = jest.spyOn(client, "fetchQuery");

    requireAuth();

    // The point of Symptom B: correctness must not depend on a probe that may never run.
    expect(client.getQueryData(queryKeys.session())).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();

    cancelAuth();
  });

  it("leaves the anonymous state in place after the user cancels", async () => {
    const client = makeClient();
    renderWithClient(client);

    const pending = requireAuth();
    cancelAuth();
    await expect(pending).rejects.toBeInstanceOf(AuthCancelledError);

    // Cancel means "I won't sign in again now" — it does not mean "I'm still signed in".
    expect(client.getQueryData(queryKeys.session())).toBe(false);
    expect(client.getQueryData(queryKeys.me())).toBeUndefined();
  });

  it("unsubscribes on unmount (no writes to a torn-down client)", () => {
    const client = makeClient();
    const { unmount } = renderWithClient(client);
    unmount();

    client.setQueryData(queryKeys.session(), true);
    requireAuth();

    expect(client.getQueryData(queryKeys.session())).toBe(true);
    cancelAuth();
  });
});

describe("AuthGateSync — navigation advances the auth epoch", () => {
  it("lets a later 401 re-open the prompt after a cancel on a previous route", () => {
    const client = makeClient();
    const { rerender } = renderWithClient(client);

    requireAuth();
    cancelAuth(); // declined on /dashboard

    // Same route: still suppressed (don't nag).
    const listener = jest.fn();
    const unsubscribe = subscribeAuthGate(listener);
    void requireAuth().catch(() => undefined);
    expect(listener).not.toHaveBeenCalled();

    // Navigate — the decline was about the previous page, not this one.
    pathname = "/guide/offerings";
    rerender(
      <QueryClientProvider client={client}>
        <AuthGateSync />
      </QueryClientProvider>,
    );

    void requireAuth().catch(() => undefined);
    expect(listener).toHaveBeenCalledWith(true);

    unsubscribe();
    cancelAuth();
  });
});
