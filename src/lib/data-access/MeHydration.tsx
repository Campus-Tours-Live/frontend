import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { queryKeys } from "./keys";
import type { Me } from "./types";

/**
 * Hands an RSC-resolved principal to the client query cache, so `useMe()` reads it instead of
 * re-fetching what the server already has.
 *
 * Every authenticated RSC guard calls `getServerMe()` (a `/v1/userinfo` round-trip) before it
 * renders anything. Without this, the client then does the SAME work again on mount: `useMe`
 * probes `/auth/session`, and only once that answers `authenticated === true` does it fetch
 * `/v1/userinfo`. Three round-trips to learn one thing the server knew before the first byte
 * of HTML.
 *
 * BOTH cache entries have to be seeded, not just the principal. `useMe` gates the `/v1/userinfo`
 * query on `enabled: authenticated === true`, so seeding `queryKeys.me()` alone leaves that
 * query disabled and the `/auth/session` probe still fires — the expensive half would be saved
 * and the pointless half kept. Seeding the session probe is sound here precisely because this
 * component only ever receives a principal a guard already resolved: having a `Me` IS the proof
 * that the session was live server-side.
 *
 * Deliberately NOT a global layout concern. It belongs on routes whose guard already read the
 * principal; putting it higher would seed a cache for pages that never needed one, and public
 * pages must keep using the `/auth/session`-first path (they have no `Me` to pass).
 *
 * A Server Component: `dehydrate` runs during the server render and only the resulting plain
 * object crosses to the client, via `HydrationBoundary`. Entries inherit `QueryProvider`'s
 * 30s `staleTime` from their `dataUpdatedAt`, so a client that mounts promptly treats them as
 * fresh and issues no request; one that mounts late revalidates on its own — the seed is a
 * head start, never a pin.
 */
export function MeHydration({ me, children }: { me: Me; children: React.ReactNode }) {
  const client = new QueryClient();
  client.setQueryData(queryKeys.session(), true);
  client.setQueryData(queryKeys.me(), me);
  return <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>;
}
