/**
 * Shared builder for the bff `GET /auth/login` URL. The bff origin is configurable via
 * NEXT_PUBLIC_BFF_URL (defaults to same-origin via the Next.js rewrite of /auth/*).
 */
const BFF_BASE = process.env.NEXT_PUBLIC_BFF_URL ?? "";

export interface LoginUrlParams {
  /** App path to return to after authentication completes. */
  returnTo: string;
  /** "signup" provisions a new account / acquires a not-yet-held role; "signin" requires an
   *  existing one. @default "signin" */
  intent?: "signup" | "signin";
  /**
   * The role this entry point is FOR (e.g. the guide/participant signup pages, or "Become a
   * Guide/Participant" in the role switcher). Written explicitly into the bff's auth tx as
   * `requestedRole` — the bff also has a legacy `returnTo`-inference fallback, but that is
   * marked for removal, so any entry that knows its target role must pass this. Omit for a
   * role-agnostic entry (e.g. plain sign-in) — the bff then routes by held roles.
   */
  role?: "GUIDE" | "PARTICIPANT";
}

/** Build the bff `/auth/login` URL for a (possibly role-specific) entry point. */
export function buildLoginUrl({ returnTo, intent = "signin", role }: LoginUrlParams): string {
  const params: Record<string, string> = { returnTo, intent };
  if (role) params.role = role;
  return `${BFF_BASE}/auth/login?${new URLSearchParams(params).toString()}`;
}
