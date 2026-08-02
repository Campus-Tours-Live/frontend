import { cookies } from "next/headers";

const SESSION_COOKIE = "ctl_sess";

/**
 * Server-side read of the caller's participant `type` (or null) for the onboarding RSC guards.
 * Mirrors getServerMe: forwards the encrypted session cookie to the BFF, decrypts nothing here,
 * never throws (null on unauthenticated / no-profile / any error). Server-only (next/headers).
 */
export async function getServerParticipantType(): Promise<string | null> {
  const session = (await cookies()).get(SESSION_COOKIE);
  if (!session) return null;
  const base = process.env.BFF_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/v1/participant/profile`, {
      headers: { cookie: `${SESSION_COOKIE}=${session.value}`, accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data ?? json;
    return (data?.type ?? null) as string | null;
  } catch {
    return null;
  }
}
