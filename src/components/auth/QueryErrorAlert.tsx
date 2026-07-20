"use client";

import type { ReactNode } from "react";
import { AuthCancelledError, requireAuth } from "@/lib/auth";
import { Alert, Button } from "@/components/ui";

/**
 * Error alert that tells the truth about WHY a query failed.
 *
 * A dismissed sign-in prompt rejects the in-flight request with `AuthCancelledError`, which
 * had no UI handling at all — so it fell through each page's generic branch and rendered
 * "Failed to load …". That mis-attributes a deliberate user choice as a broken page: the
 * user retries, sees the same thing, and reports a bug (N1a Symptom A′).
 *
 * Pass the query's `error` alongside the message you'd otherwise have shown; the auth case
 * gets an actionable prompt instead.
 */
export function QueryErrorAlert({ error, children }: { error: unknown; children: ReactNode }) {
  if (error instanceof AuthCancelledError) {
    return (
      <Alert variant="error">
        <span className="flex flex-wrap items-center gap-2">
          Please sign in again to see this.
          {/* `force`: the user's own cancel suppressed this epoch's prompts, so without it
              their explicit click would be swallowed and the button would look broken. */}
          <Button
            variant="ghost"
            onClick={() => void requireAuth({ force: true }).catch(() => undefined)}
          >
            Sign in
          </Button>
        </span>
      </Alert>
    );
  }

  return <Alert variant="error">{children}</Alert>;
}
