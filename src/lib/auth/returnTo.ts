/**
 * Canonical `returnTo` sanitiser, shared by the sign-in page (and mirrored by the
 * BFF). A `returnTo` only ever points back into the authenticated app, so we:
 *  - reject anything that isn't a site-relative path (no absolute / protocol-
 *    relative / backslash tricks → no open redirect), and
 *  - allowlist the known authenticated roots.
 *
 * Returns a safe path, falling back to the dashboard.
 */
export const DEFAULT_RETURN_TO = "/dashboard";

const ALLOWED_RETURN_ROOTS = [
  "/dashboard",
  "/profile",
  "/support",
  "/staff",
  "/onboarding",
  "/guide",
];

export function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value) return DEFAULT_RETURN_TO;

  // Must be a plain site-relative path. Block absolute URLs, protocol-relative
  // ("//evil"), and backslash variants browsers may normalise to "//".
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://")
  ) {
    return DEFAULT_RETURN_TO;
  }

  const cut = value.search(/[?#]/);
  const pathname = cut === -1 ? value : value.slice(0, cut);
  const allowed = ALLOWED_RETURN_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );

  return allowed ? value : DEFAULT_RETURN_TO;
}
