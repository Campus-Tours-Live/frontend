"use client";

/** Google sign-in/sign-up entry that redirects authentication to the BFF. */

import { useState } from "react";
import { buildLoginUrl } from "@/lib/auth/loginUrl";
import { Button, Caption, GoogleMark, Spinner } from "@/components/ui";

export interface AuthOptionsProps {
  
  returnTo?: string;
  
  intent?: "signup" | "signin";
  
  role?: "GUIDE" | "PARTICIPANT";
  
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
