import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { MeHydration } from "@/lib/data-access/MeHydration";
import { queryKeys } from "@/lib/data-access/keys";
import type { Me } from "@/lib/data-access/types";
import { pendingMe, provisionedMe } from "../../../support/meFixtures";

/**
 * `MeHydration` exists to delete round-trips: an RSC guard has ALREADY read the principal via
 * `getServerMe()`, so the client re-fetching `/auth/session` + `/v1/userinfo` to learn the same
 * thing is pure waste. These tests assert the seeded cache is what `useMe` actually reads —
 * both entries, under the real `queryKeys` — because seeding the wrong key fails SILENTLY
 * (the client simply refetches, and the only symptom is an extra request in the network tab).
 */

/** Mirrors `useMe`'s two-phase read without pulling in its client-only network module. */
function TwoPhaseProbe() {
  const session = useQuery({
    queryKey: queryKeys.session(),
    queryFn: () => {
      throw new Error("fetched /auth/session — the hydrated cache was not used");
    },
  });
  const me = useQuery({
    queryKey: queryKeys.me(),
    queryFn: (): Me | null => {
      throw new Error("fetched /v1/userinfo — the hydrated cache was not used");
    },
    enabled: session.data === true,
  });
  return (
    <div>
      <span data-testid="authenticated">{String(session.data)}</span>
      <span data-testid="status">{me.data?.provisioningStatus ?? "none"}</span>
      <span data-testid="email">{me.data?.user.email ?? "none"}</span>
    </div>
  );
}

/**
 * Renders through a REAL `QueryClientProvider` whose `staleTime` matches `QueryProvider`'s, so
 * each assertion means "the client resolved this from cache without fetching" rather than
 * "an object was passed down". Both `queryFn`s throw, so a cache miss surfaces as a failure
 * instead of a silent refetch.
 */
function renderHydrated(me: Me) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MeHydration me={me}>
        <TwoPhaseProbe />
      </MeHydration>
    </QueryClientProvider>,
  );
}

describe("MeHydration", () => {
  it("seeds a PENDING principal so the client resolves it without any fetch", () => {
    renderHydrated(pendingMe({ email: "first.timer@example.com" }));

    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("status")).toHaveTextContent("PENDING");
    expect(screen.getByTestId("email")).toHaveTextContent("first.timer@example.com");
  });

  it("seeds a PROVISIONED principal (second-role acquisition) the same way", () => {
    renderHydrated(provisionedMe({ roles: ["PARTICIPANT"], currentRole: "PARTICIPANT" }));

    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("status")).toHaveTextContent("PROVISIONED");
  });

  it("unblocks the me query by seeding the session probe too, not just the principal", () => {
    // Regression guard: seeding ONLY queryKeys.me() leaves `enabled: authenticated === true`
    // false, so useMe would still call /auth/session and report a loading principal.
    renderHydrated(pendingMe());

    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("status")).not.toHaveTextContent("none");
  });
});
