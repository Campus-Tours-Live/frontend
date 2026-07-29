import { cookies } from "next/headers";
import type { Me } from "@/lib/data-access/types";
import { meSchema } from "@/lib/data-access/me.schema";

const SESSION_COOKIE = "ctl_sess";

/**
 * Server-side principal fetch for RSC route guards. Reads the
 * encrypted session cookie and asks the BFF (which decrypts it and calls Core);
 * we only forward the cookie, never decrypt it here.
 *
 * Never throws — returns null when unauthenticated, on any error, OR when the response
 * doesn't parse as a valid {@link Me} (via the shared `meSchema` — the SAME parser `useMe`
 * uses client-side). A malformed body is treated as "no usable principal", consistent with
 * the rest of this function's null-on-error contract; guards can treat null as "send to auth".
 * The client `apiFetch` is client-only and uses relative/same-origin semantics, so it can't be
 * reused server-side; this hits the BFF directly via BFF_URL. Server-only (imports
 * next/headers); intentionally NOT exported from the data-access client barrel.
 */
export async function getServerMe(): Promise<Me | null> {
  const session = (await cookies()).get(SESSION_COOKIE);
  if (!session) return null;

  const base = process.env.BFF_URL;
  if (!base) return null;

  try {
    const res = await fetch(`${base}/v1/userinfo`, {
      headers: {
        cookie: `${SESSION_COOKIE}=${session.value}`,
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = meSchema.safeParse(json?.data ?? json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
