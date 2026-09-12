"use client";

import type { ReactNode } from "react";

import {
  isAuthCancelled,
  requireAuth,
  SIGN_IN_AGAIN_MESSAGE,
} from "@/lib/auth";
import { Alert, Button } from "@/components/ui";

/**
 * Shows an auth-specific message when a query failed because the user
 * cancelled re-authentication. Otherwise, it renders the normal error.
 */
export function QueryErrorAlert({
  error,
  children,
}: {
  error: unknown;
  children: ReactNode;
}) {
  if (isAuthCancelled(error)) {
    return (
      <Alert variant="error">
        <span className="flex flex-wrap items-center gap-2">
          {SIGN_IN_AGAIN_MESSAGE}
          <Button
            variant="ghost"
            onClick={() =>
              void requireAuth({ force: true }).catch(() => undefined)
            }
          >
            Sign in
          </Button>
        </span>
      </Alert>
    );
  }

  return <Alert variant="error">{children}</Alert>;
}
