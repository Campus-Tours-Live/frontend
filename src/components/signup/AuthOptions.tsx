"use client";

import { useState } from "react";
import { Button, Caption, GoogleMark, Spinner } from "@/components/ui";

/**
 * AuthOptions — Google sign-in entry used by the signup / sign-in screens.
 *
 * Authentication is delegated to the BFF, which runs Google OAuth (Authorization
 * Code + PKCE) and keeps tokens in a server-side httpOnly session. This app never
 * handles passwords or tokens itself. Signing up and signing in are the same
 * action: pick your Google account; the account is provisioned on first login.
 *
 * The BFF origin is configurable via NEXT_PUBLIC_BFF_URL (defaults to same-origin
 * via the Next.js rewrite of /auth/*).
 */
const BFF_BASE = process.env.NEXT_PUBLIC_BFF_URL ?? "";

export interface AuthOptionsProps {
  /** App path to return to after authentication completes. */
  returnTo?: string;
  /** "signup" provisions a new account; "signin" requires an existing one. */
  intent?: "signup" | "signin";
}

export function AuthOptions({ returnTo = "/dashboard", intent = "signin" }: AuthOptionsProps) {
  const [pending, setPending] = useState(false);

  const handleGoogle = () => {
    setPending(true);
    const qs = new URLSearchParams({ returnTo, intent }).toString();
    window.location.assign(`${BFF_BASE}/auth/login?${qs}`);
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
