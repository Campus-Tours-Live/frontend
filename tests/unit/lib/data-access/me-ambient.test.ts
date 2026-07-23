import { meOptions } from "@/lib/data-access/queries/me.query";
import { requireAuth, getAuthNotice, clearAuthNotice, resetAuthGate } from "@/lib/auth";

/**
 * N3 — the header's principal read is AMBIENT, and its two failure modes point opposite ways.
 *
 * SUPERSEDES `me.query.reauth.test.ts` (added by M4, deleted here). That file pinned M4's
 * remedy — "a re-auth 401 calls requireAuth" — which N3 deliberately reverses: the INVARIANT
 * it protected still holds and is still tested below ("a dead session must never render as a
 * silent logged-out view"), but it is now satisfied by a banner instead of by a modal. Its
 * other case (a plain 401 stays quiet) is kept below too, so nothing was dropped.
 *
 *  - re-auth 401 → the BFF already cleared the cookie. The user IS signed out; say so via a
 *    banner and let the page carry on. (M4 was right that this must not be silent, and wrong
 *    that the remedy was a modal on every page including public ones.)
 *  - 503 AUTH_UPSTREAM_UNAVAILABLE → N2's "Google was unreachable, session preserved". The
 *    user is STILL SIGNED IN and the server knows it. Rendering this as signed-out is M4's
 *    original symptom returning through a new trigger, and offering a sign-in prompt would
 *    be nonsense — nothing is wrong with their session.
 */
jest.mock("@/lib/auth", () => {
  const actual = jest.requireActual<typeof import("@/lib/auth")>("@/lib/auth");
  return { ...actual, requireAuth: jest.fn().mockResolvedValue(undefined) };
});

const mockedRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

function makeRes(status: number, headers: Record<string, string> = {}, body?: unknown): Response {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (n: string) => map.get(n.toLowerCase()) ?? null },
    body: { cancel: jest.fn().mockResolvedValue(undefined) },
    json: jest.fn().mockResolvedValue(body ?? {}),
  } as unknown as Response;
}

let fetchMock: jest.Mock;
const runFetchMe = () => (meOptions().queryFn as () => Promise<unknown>)();

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  mockedRequireAuth.mockReset().mockResolvedValue(undefined);
  resetAuthGate();
  clearAuthNotice();
});

describe("fetchMe — dead session", () => {
  it("reports it via the notice channel instead of seizing the page", async () => {
    fetchMock.mockResolvedValue(makeRes(401, { "Auth-Required": "reauthenticate" }));

    const result = await runFetchMe();

    expect(getAuthNotice()).toBe("expired");
    expect(mockedRequireAuth).not.toHaveBeenCalled(); // no modal — this was M4's mistake
    expect(result).toBeNull();
  });

  it("stays silent on a plain 401", async () => {
    fetchMock.mockResolvedValue(makeRes(401));

    expect(await runFetchMe()).toBeNull();
    expect(getAuthNotice()).toBeNull();
  });
});

describe("fetchMe — session cannot be verified (N2's 503)", () => {
  it("raises 'unverifiable', NOT 'expired' — the session is intact", async () => {
    fetchMock.mockResolvedValue(
      makeRes(
        503,
        {},
        { title: "Sign-in service temporarily unavailable", code: "AUTH_UPSTREAM_UNAVAILABLE" },
      ),
    );

    await expect(runFetchMe()).rejects.toThrow();

    expect(getAuthNotice()).toBe("unverifiable");
    expect(mockedRequireAuth).not.toHaveBeenCalled();
  });

  it("THROWS rather than resolving null, so the cached principal survives", async () => {
    // Resolving null would assert "this user is signed out", which is false and would flip
    // the header to logged-out. Throwing leaves React Query's last good `data` in place.
    fetchMock.mockResolvedValue(makeRes(503, {}, { code: "AUTH_UPSTREAM_UNAVAILABLE" }));

    await expect(runFetchMe()).rejects.toMatchObject({ status: 503 });
  });

  it("does not claim 'unverifiable' for an unrelated 503", async () => {
    fetchMock.mockResolvedValue(
      makeRes(503, {}, { title: "Upstream down", code: "SOMETHING_ELSE" }),
    );

    await expect(runFetchMe()).rejects.toThrow();
    expect(getAuthNotice()).toBeNull();
  });
});
