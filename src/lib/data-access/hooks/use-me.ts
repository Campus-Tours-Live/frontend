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
   * With a cached principal this cannot happen (the query keeps its last good `data`), so
   * this is only the no-cache path. The honest answer is neither signed-in nor signed-out:
   * we do not know.
   *
   * It is reported as its OWN state, deliberately NOT folded into `isLoading`. An earlier
   * version did fold it in, which reads fine in the header but made `/profile` — which does
   * `if (isLoading) return <InlineLoading/>` — spin forever during a sustained outage. An
   * indefinite spinner is a worse lie than either truth. A timeout would not have helped:
   * after N seconds we still would not know, and there is no honest state to fall back TO
   * ("signed out" is false, and a false sign-out is the symptom this whole path exists to
   * avoid). Consumers
   * decide instead: the header shows no identity, a protected page explains itself.
   */
  const sessionUnverified = data === undefined && isSessionUnverifiable(meError);

  const me = authenticated ? (data ?? null) : null;
  const isLoading = sessionLoading || (authenticated === true && meLoading);
  return {
    me,
    isLoading,
    /**
     * We could not CHECK the session and have no cached principal — not a claim that the
     * user is signed out. Treat as "unknown": never render a signed-out state off this.
     */
    sessionUnverified,
    /** Onboarded = a PROVISIONED principal (always holds ≥1 role). Gated on `accountState`,
     *  NEVER inferred from `roles.length` — a bare/pending account has no roles yet, but
     *  `roles.length` alone can't distinguish "pending" from "an empty array we forgot to
     *  populate" the way the discriminant can. */
    isOnboarded: me?.accountState === "PROVISIONED",
    hasRole: (r: Role) => me != null && me.accountState === "PROVISIONED" && me.roles.includes(r),
  };
}
