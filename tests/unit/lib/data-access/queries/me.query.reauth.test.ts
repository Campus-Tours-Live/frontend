import { meOptions } from "@/lib/data-access/queries/me.query";
import { requireAuth } from "@/lib/auth";

// Drives the REAL fetchMe -> apiJson -> apiFetch chain (only `fetch` and the auth gate are
// mocked), because the behaviour under test IS how that chain treats an `Auth-Required` 401.
jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn().mockResolvedValue(undefined),
}));

const mockedRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

function makeRes(opts: { status: number; headers?: Record<string, string>; body?: unknown }) {
  const headerMap = new Map(
    Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    status: opts.status,
    ok: opts.status >= 200 && opts.status < 300,
    headers: { get: (n: string) => headerMap.get(n.toLowerCase()) ?? null },
    body: { cancel: jest.fn().mockResolvedValue(undefined) },
    json: jest.fn().mockResolvedValue(opts.body ?? {}),
    text: jest.fn().mockResolvedValue(""),
  } as unknown as Response;
}

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  mockedRequireAuth.mockReset();
  mockedRequireAuth.mockResolvedValue(undefined);
});

const runFetchMe = () => (meOptions().queryFn as () => Promise<unknown>)();

describe("fetchMe — a dead session must not masquerade as 'logged out'", () => {
  /**
   * The scenario: cookie present, token expired/revoked. `/auth/session` is a cookie-PRESENCE
   * check that makes no Core call, so it answers `authenticated: true` and useMe proceeds to
   * `/v1/userinfo` — which 401s with `Auth-Required: reauthenticate`. Swallowing that as `null`
   * renders a signed-in guide the logged-out view ("This page is coming soon." on /profile)
   * instead of asking them to sign in again.
   *
   * Note this 401 can never be an anonymous visitor: useMe only issues this request when the
   * session probe already said `authenticated === true`.
   */
  it("escalates to re-auth when the BFF asks for re-authentication", async () => {
    fetchMock
      .mockResolvedValueOnce(
        makeRes({ status: 401, headers: { "Auth-Required": "reauthenticate" } }),
      )
      .mockResolvedValueOnce(makeRes({ status: 200, body: { data: { id: "u1" } } }));

    const result = await runFetchMe();

    expect(mockedRequireAuth).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: "u1" });
  });

  it("still reads a plain 401 (no Auth-Required) as logged-out, without the modal", async () => {
    // The ambient case the `interactive: false` opt-out exists for: no re-auth signal from the
    // BFF, so this is "not signed in", not "your session died".
    fetchMock.mockResolvedValue(makeRes({ status: 401 }));

    const result = await runFetchMe();

    expect(mockedRequireAuth).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
