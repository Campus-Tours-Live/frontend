"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthCancelledError } from "@/lib/auth";
import { ApiError } from "./http";

/**
 * Never retry a cancelled re-auth or a client (4xx) error — only transient failures
 * (network / 5xx) get one retry.
 *
 * Exported so it is tested directly. Inlining it in the provider forced its test to
 * re-implement the rule and assert against that copy, which verifies the copy, not this.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof AuthCancelledError) return false;
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

/**
 * Honour the server's `Retry-After` when it sent one.
 *
 * The BFF's `503 AUTH_UPSTREAM_UNAVAILABLE` asks for 5s precisely because Google is having a bad
 * minute. Retrying on our own ~1s default would mean that during a Google incident every
 * client retries harder than the server just asked, adding load to the outage that caused
 * it. Anything without the header keeps the previous exponential backoff.
 */
export function retryDelayMs(attemptIndex: number, error: unknown): number {
  if (error instanceof ApiError && error.retryAfterMs) return error.retryAfterMs;
  return Math.min(1000 * 2 ** attemptIndex, 30_000);
}

/**
 * App-wide React Query client. Mounted once near the root so every client
 * component shares one cache (e.g. a single `/userinfo` request — see useMe).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Never retry a cancelled re-auth or a client (4xx) error — only
            // transient failures (network / 5xx) get one retry.
            retry: shouldRetry,
            retryDelay: retryDelayMs,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
