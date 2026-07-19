"use client";

import { useQuery } from "@tanstack/react-query";
import { meOptions } from "../queries/me.query";
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
  const { data, isLoading: meLoading } = useQuery({
    ...meOptions(),
    enabled: authenticated === true,
  });
  const me = authenticated ? (data ?? null) : null;
  const isLoading = sessionLoading || (authenticated === true && meLoading);
  return {
    me,
    isLoading,
    /** Onboarded = holds ≥1 role. A bare account (mid first-onboarding) is not. */
    isOnboarded: !!me && (me.roles?.length ?? 0) > 0,
    hasRole: (r: Role) => Boolean(me?.roles?.includes(r)),
  };
}
