"use client";

import { useEffect, useState } from "react";
import { clearAuthNotice, requireAuth, subscribeAuthNotice, type AuthNotice } from "@/lib/auth";
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
export function SessionNoticeBanner() {
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  useEffect(() => subscribeAuthNotice(setNotice), []);

  if (!notice) return null;

  if (notice === "unverifiable") {
    return (
      <Banner variant="warning" role="status" onClose={clearAuthNotice}>
        We couldn&apos;t verify your session just now. You&apos;re still signed in.
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
