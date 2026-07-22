import { meOptions } from "@/lib/data-access/queries/me.query";
import { getAuthNotice, clearAuthNotice, notifyAuthNotice, resetAuthGate } from "@/lib/auth";

/**
 * N3 review follow-up — the `unverifiable` notice must be able to GO AWAY.
 *
 * As first shipped, the only thing that cleared it was the user closing the banner by hand.
 * Nothing on a success path did, and `shouldRetry` allows a 503 exactly one retry, so there
 * is no polling loop either. Net effect: the banner said "we'll keep retrying", the system
 * retried once and possibly succeeded, and the banner stayed anyway — making a recovered
 * system look broken. That is worse than showing nothing.
 */
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
  resetAuthGate();
  clearAuthNotice();
});

describe("recovery clears the notice", () => {
  it("clears 'unverifiable' as soon as the principal read succeeds", async () => {
    notifyAuthNotice("unverifiable");
    fetchMock.mockResolvedValue(makeRes(200, {}, { data: { id: "u1" } }));

    await runFetchMe();

    expect(getAuthNotice()).toBeNull();
  });

  it("clears 'expired' too — a successful read proves the session is good", async () => {
    notifyAuthNotice("expired");
    fetchMock.mockResolvedValue(makeRes(200, {}, { data: { id: "u1" } }));

    await runFetchMe();

    expect(getAuthNotice()).toBeNull();
  });

  it("still raises 'unverifiable' when the read fails that way", async () => {
    fetchMock.mockResolvedValue(makeRes(503, {}, { code: "AUTH_UPSTREAM_UNAVAILABLE" }));

    await expect(runFetchMe()).rejects.toThrow();

    expect(getAuthNotice()).toBe("unverifiable");
  });
});
