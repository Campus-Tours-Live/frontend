"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeAuthGate, advanceAuthEpoch } from "@/lib/auth";
// Deep import on purpose: the data-access barrel documents `keys` as internal, and this
// adapter is exactly the kind of internal consumer that convention is written for.
import { queryKeys } from "@/lib/data-access/keys";

/**
 * Keeps client auth state in step with the server's, and keeps a decline from outliving
 * the page it was made on. Renders nothing.
 *
 * WHY THIS EXISTS (N1a). A re-auth 401 from the BFF *already cleared the session cookie*
 * server-side, but nothing on the client acted on that fact:
 *
 *   - the cached `["session"]` stayed `true`, so the header kept rendering the signed-in
 *     state — indefinitely, since `staleTime` only marks data stale and
 *     `refetchOnWindowFocus` is off, so with the header mounted in the layout and no
 *     navigation there is no trigger to re-probe (Symptom B);
 *   - and a Cancel merely suppressed the dialog rather than moving the app to the anonymous
 *     state the server already believed in, leaving the UI self-contradictory.
 *
 * WHERE IT SITS. `lib/auth` is a plain framework-agnostic module by design, so it must not
 * import a QueryClient. This component is the adapter: it consumes the EXISTING
 * `subscribeAuthGate` channel and owns the React/cache side.
 */
export function AuthGateSync() {
  const queryClient = useQueryClient();
  const pathname = usePathname();

  useEffect(
    () =>
      subscribeAuthGate((open) => {
        if (!open) return;
        // The gate opens only on the BFF's explicit re-auth signal — by which point the
        // server has cleared the cookie. Reflect that immediately rather than waiting for a
        // probe that may never run.
        //
        // ORDER IS LOAD-BEARING — do not swap these two lines. Writing `session = false`
        // first flips `useMe`'s `enabled` to false, so the `me` query is no longer observed
        // by the time it is removed. Removing an actively-observed query instead triggers a
        // refetch, which immediately eats another 401. Not an infinite loop (the gate is
        // already open, so `requireAuth` returns the same pending promise), but a wasted
        // request on a user we already know is signed out.
        queryClient.setQueryData(queryKeys.session(), false);
        queryClient.removeQueries({ queryKey: queryKeys.me() });
      }),
    [queryClient],
  );

  // A decline is about the page the user was on. Navigating is a fresh context, so the
  // prompt is allowed to appear again — see the epoch note in authGate.ts.
  useEffect(() => {
    advanceAuthEpoch();
  }, [pathname]);

  return null;
}
