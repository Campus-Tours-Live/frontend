/**
 * Log the user out via a POST — not a CSRF-forgeable GET. Builds and submits a throwaway form to
 * `/auth/logout`; the BFF clears the session and 302-redirects to the web app, which the browser
 * follows (same UX as the old link). It's same-origin (Next rewrites `/auth/*` to the BFF), so the
 * BFF's CSRF guard passes without a token. Client-only (uses `document`).
 */
export function submitLogout(): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/auth/logout";
  document.body.appendChild(form);
  form.submit();
}
