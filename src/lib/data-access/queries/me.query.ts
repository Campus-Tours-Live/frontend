// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { queryOptions } from "@tanstack/react-query";
import { ApiError, apiJson } from "../http";
import { queryKeys } from "../keys";
import type { Me } from "../types";

async function fetchMe(): Promise<Me | null> {
  try {
    // Interactive on purpose. `useMe` only issues this request once the `/auth/session` probe has
    // already answered `authenticated === true`, so a 401 here is never an anonymous visitor — it
    // is a session that DIED (token expired/revoked, silent refresh failed). `/auth/session` is a
    // cookie-PRESENCE check that makes no Core call, so it cannot catch that itself.
    //
    // apiFetch escalates only on `401 + Auth-Required: reauthenticate` (the BFF's explicit
    // "re-authenticate" signal) and hands any other 401 back to the catch below. Opting out with
    // `interactive: false` disabled that distinction and swallowed the dead session as `null`,
    // dropping a signed-in user onto the logged-out view with no explanation.
    return await apiJson<Me>("/v1/userinfo");
  } catch (error) {
    // A 401 WITHOUT the re-auth signal is a genuine "not signed in" — stay quiet.
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export const meOptions = () => queryOptions({ queryKey: queryKeys.me(), queryFn: fetchMe });
