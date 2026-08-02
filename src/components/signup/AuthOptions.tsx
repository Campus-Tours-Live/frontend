"use client";

import { useState } from "react";
import { buildLoginUrl } from "@/lib/auth/loginUrl";
import { Button, Caption, GoogleMark, Spinner } from "@/components/ui";

/**
 * AuthOptions — Google sign-in entry used by the signup / sign-in screens.
 *
 * Authentication is delegated to the BFF, which runs Google OAuth (Authorization
 * Code + PKCE) and keeps tokens in a server-side httpOnly session. This app never
 * handles passwords or tokens itself. Signing up and signing in are the same
 * action: pick your Google account; the account is provisioned on first login.
 */
export interface AuthOptionsProps {
  /** App path to return to after authentication completes. */
  returnTo?: string;
  /** "signup" provisions a new account; "signin" requires an existing one. */
  intent?: "signup" | "signin";
  /** Known target role for a role-specific entry (the /signup/guide and /signup/participant
   *  pages) — passed through to /auth/login so the bff sets `requestedRole` explicitly. Omit
   *  for a role-agnostic entry (/signin), which routes by held roles instead. */
  role?: "GUIDE" | "PARTICIPANT";
  /** Override redirect behavior in tests without replacing jsdom's window.location. */
  navigate?: (url: string) => void;
}

export function AuthOptions({
  returnTo = "/dashboard",
  intent = "signin",
  role,
  navigate = (url) => window.location.assign(url),
}: AuthOptionsProps) {
  const [pending, setPending] = useState(false);

  const handleGoogle = () => {
    setPending(true);
    navigate(buildLoginUrl({ returnTo, intent, role }));
  };

  return (
    <div className="flex flex-col gap-4">
      <Button variant="secondary" block onClick={handleGoogle} disabled={pending} className="gap-3">
        {pending ? <Spinner /> : <GoogleMark />}
        {pending ? "Redirecting…" : "Continue with Google"}
      </Button>

      <Caption as="p" className="text-center">
        Secure sign-in with your Google account — no password to manage.
      </Caption>
    </div>
  );
}
