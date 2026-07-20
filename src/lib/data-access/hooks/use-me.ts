"use client";

import { useQuery } from "@tanstack/react-query";
import { isSessionUnverifiable, meOptions } from "../queries/me.query";
import { sessionOptions } from "../queries/session.query";
import type { Role } from "../types";

/**
 * Single source of truth for the current principal. Two-phase so public / logged-out pages never
 * call the PROTECTED `/v1/userinfo` (which 401s when signed out): first the always-200
 * `/auth/session` presence check, then `/v1/userinfo` for roles ONLY when authenticated. Both are
 * cached and shared across the app (header, nav, dashboards).
 */
export function useMe() {
  const { data: authenticated, isLoading: sessionLoading } = useQuery(sessionOptions());
  const {
    data,
    isLoading: meLoading,
    error: meError,
  } = useQuery({
    ...meOptions(),
    enabled: authenticated === true,
  });

  /**
   * COLD START during a Google outage: the session is fine, but we have never managed to
   * read the principal, so `data` is undefined. Reporting that as `me = null` would render
   * the signed-out header — underneath a banner telling the user they are still signed in.
   *
   * With a cached principal this cannot happen (the query keeps its last good `data`); this
   * is only the no-cache path. The honest state is neither signed-in nor signed-out: we do
   * not know yet, so it stays "resolving" and the header shows neither identity nor a
   * sign-out affordance until we do.
   */
  const unverified = data === undefined && isSessionUnverifiable(meError);

  const me = authenticated ? (data ?? null) : null;
  const isLoading = sessionLoading || (authenticated === true && (meLoading || unverified));
  return {
    me,
    isLoading,
    /** Onboarded = holds ≥1 role. A bare account (mid first-onboarding) is not. */
    isOnboarded: !!me && (me.roles?.length ?? 0) > 0,
    hasRole: (r: Role) => Boolean(me?.roles?.includes(r)),
  };
}
