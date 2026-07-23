// Client-only. The BFF's GET /auth/session is a lightweight, always-200 auth-presence check
// ({ authenticated }) that makes NO Core call and is NOT under /vN — so we hit it directly here
// (apiFetch only accepts versioned resource paths). Public / logged-out pages use this to decide
// whether to show signed-in UI WITHOUT calling the protected /v1/userinfo (which 401s when logged
// out). useMe() gates the /v1/userinfo read on `authenticated === true`.
import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "../keys";

async function fetchSession(): Promise<boolean> {
  try {
    const res = await fetch("/auth/session", { credentials: "same-origin" });
    if (!res.ok) return false;
    const body = (await res.json()) as { authenticated?: boolean };
    return Boolean(body.authenticated);
  } catch {
    // Network/parse failure → treat as logged-out (fail closed for UI purposes).
    return false;
  }
}

export const sessionOptions = () =>
  queryOptions({ queryKey: queryKeys.session(), queryFn: fetchSession });
