"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  clearAuthNotice,
  requireAuth,
  subscribeAuthNotice,
  type AuthNoticeState,
} from "@/lib/auth";
import { queryKeys } from "@/lib/data-access/keys";
import { Banner, Button } from "@/components/ui";

const DEFAULT_COOLDOWN_MS = 5000;

/**
 * Shows non-blocking session status messages.
 *
 * "expired" means the session is gone and the user should sign in again.
 * "unverifiable" means the session still exists but could not be checked right now.
 */
export function SessionNoticeBanner() {
  const [state, setState] = useState<AuthNoticeState | null>(null);
  const [coolingDown, setCoolingDown] = useState(false);

  const queryClient = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => subscribeAuthNotice(setState), []);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  const cooldownMs = state?.retryAfterMs ?? DEFAULT_COOLDOWN_MS;

  const retry = useCallback(() => {
    setCoolingDown(true);

    void queryClient.refetchQueries({
      queryKey: queryKeys.me(),
    });

    timer.current = setTimeout(
      () => setCoolingDown(false),
      cooldownMs,
    );
  }, [queryClient, cooldownMs]);

  if (!state) return null;

  if (state.notice === "unverifiable") {
    return (
      <Banner
        variant="warning"
        role="status"
        onClose={clearAuthNotice}
      >
        <span className="flex flex-wrap items-center gap-2">
          We couldn&apos;t verify your session just now. You&apos;re still signed in.
          <Button
            variant="ghost"
            onClick={retry}
            disabled={coolingDown}
          >
            Try again
          </Button>
        </span>
      </Banner>
    );
  }

  return (
    <Banner
      variant="warning"
      role="status"
      onClose={clearAuthNotice}
    >
      <span className="flex flex-wrap items-center gap-2">
        Your session expired.
        <Button
          variant="ghost"
          onClick={() =>
            void requireAuth({ force: true }).catch(() => undefined)
          }
        >
          Sign in
        </Button>
      </span>
    </Banner>
  );
}
