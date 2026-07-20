"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearAuthNotice,
  requireAuth,
  subscribeAuthNotice,
  type AuthNoticeState,
} from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/data-access/keys";
import { Banner, Button } from "@/components/ui";

/**
 * Persistent, non-blocking notice about the session (N3).
 *
 * This is the alternative to the modal M4 reached for. A background read that discovers the
 * session died has learned something worth telling the user — but the user did not ask for
 * anything, so the page must stay usable and nothing may be seized. Escalation to a prompt
 * is reserved for the moment they actually request something that needs a session.
 *
 * The two notices are deliberately different messages, not one message with a variant:
 *
 *  - `expired`      — the server has already cleared the session. Signing in again is the
 *                     correct action, so offer it.
 *  - `unverifiable` — N2's 503: Google was unreachable, the session was PRESERVED, and the
 *                     server knows the user is still signed in. Offering "sign in again"
 *                     would be false, and acting on it would discard exactly the session N2
 *                     protected. So: state it and offer nothing.
 *
 * The `unverifiable` copy states a fact and promises nothing on purpose. An earlier draft
 * said "we'll keep retrying", which we do not: `shouldRetry` allows a 503 exactly one retry
 * and there is no polling loop (deliberately — polling during a Google outage would add load
 * to the outage, which is what honouring `Retry-After` exists to avoid). In practice the
 * notice does clear itself, because a successful principal read clears it — but that is a
 * pleasant surprise rather than something the copy commits to.
 *
 * Dismissing clears the notice rather than suppressing it: the session really is still dead,
 * so if a later background read hits the same wall the banner returns. It never blocks
 * anything, so that is honest rather than naggy — unlike the gate, which is why the gate has
 * epoch-scoped suppression and this does not.
 */
/** Cooldown used when the server didn't name one. Matches the BFF's current `Retry-After: 5`. */
const DEFAULT_COOLDOWN_MS = 5000;

export function SessionNoticeBanner() {
  const [state, setState] = useState<AuthNoticeState | null>(null);
  const [coolingDown, setCoolingDown] = useState(false);
  const queryClient = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => subscribeAuthNotice(setState), []);
  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const cooldownMs = state?.retryAfterMs ?? DEFAULT_COOLDOWN_MS;

  const retry = useCallback(() => {
    setCoolingDown(true);
    void queryClient.refetchQueries({ queryKey: queryKeys.me() });
    // Cool down for exactly as long as the server asked. `Retry-After` governs AUTOMATIC
    // retries, and an explicit click is a different thing — the user is allowed to ask. But
    // a struggling upstream still should not be hammered, so the click borrows the server's
    // own pace rather than inventing one. On success the notice clears and this unmounts, so
    // the timer only ever matters while the outage continues.
    timer.current = setTimeout(() => setCoolingDown(false), cooldownMs);
  }, [queryClient, cooldownMs]);

  if (!state) return null;

  if (state.notice === "unverifiable") {
    return (
      <Banner variant="warning" role="status" onClose={clearAuthNotice}>
        <span className="flex flex-wrap items-center gap-2">
          We couldn&apos;t verify your session just now. You&apos;re still signed in.
          {/* The only way out during a sustained outage: there is no polling loop (that
              would add load to the very outage causing this), so without this control the
              user's options were navigating and luck. */}
          <Button variant="ghost" onClick={retry} disabled={coolingDown}>
            Try again
          </Button>
        </span>
      </Banner>
    );
  }

  return (
    <Banner variant="warning" role="status" onClose={clearAuthNotice}>
      <span className="flex flex-wrap items-center gap-2">
        Your session expired.
        {/* `force`: the user is explicitly asking, which outranks any earlier decline. */}
        <Button
          variant="ghost"
          onClick={() => void requireAuth({ force: true }).catch(() => undefined)}
        >
          Sign in
        </Button>
      </span>
    </Banner>
  );
}
