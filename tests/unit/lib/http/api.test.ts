import { apiFetch } from "@/lib/http/api";
import { requireAuth } from "@/lib/auth";

// api.ts integrates the re-auth gate via requireAuth from "@/lib/auth". Mock the
// whole barrel so the gate never opens a real modal and we can assert calls.
jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn().mockResolvedValue(undefined),
}));

const mockedRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

/**
 * Minimal Response-like stub. `headers` mimics the Headers API's `get` with
 * case-insensitive lookup (api.ts reads the "auth-required" header).
 */
function makeRes(opts: { status: number; headers?: Record<string, string> }): Response {
  const headerMap = new Map(
    Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const cancel = jest.fn().mockResolvedValue(undefined);
  return {
    status: opts.status,
    ok: opts.status >= 200 && opts.status < 300,
    headers: { get: (name: string) => headerMap.get(name.toLowerCase()) ?? null },
    body: { cancel },
  } as unknown as Response;
}

const REAUTH_HEADER = { "Auth-Required": "reauthenticate" } as const;

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  mockedRequireAuth.mockReset();
  mockedRequireAuth.mockResolvedValue(undefined);
});

describe("apiFetch path guard", () => {
  it("throws for a non-versioned path", async () => {
    await expect(apiFetch("/auth/session")).rejects.toThrow(/versioned BFF paths/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws for an absolute / third-party URL", async () => {
    await expect(apiFetch("https://evil.example/v1/x")).rejects.toThrow(/versioned BFF paths/);
  });

  it("accepts any /vN/ version segment", async () => {
    fetchMock.mockResolvedValue(makeRes({ status: 200 }));
    await expect(apiFetch("/v2/userinfo")).resolves.toMatchObject({
      status: 200,
    });
  });
});

describe("apiFetch request construction", () => {
  it("calls global fetch with the relative path and same-origin credentials", async () => {
    fetchMock.mockResolvedValue(makeRes({ status: 200 }));

    await apiFetch("/v1/userinfo");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/v1/userinfo", {
      credentials: "same-origin",
    });
  });

  it("forwards method, headers and body while still injecting credentials", async () => {
    fetchMock.mockResolvedValue(makeRes({ status: 200 }));
    const body = JSON.stringify({ a: 1 });

    await apiFetch("/v1/guide/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    });

    expect(fetchMock).toHaveBeenCalledWith("/v1/guide/profile", {
      credentials: "same-origin",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    });
  });

  it("lets a caller override credentials", async () => {
    fetchMock.mockResolvedValue(makeRes({ status: 200 }));

    await apiFetch("/v1/userinfo", { credentials: "include" });

    expect(fetchMock).toHaveBeenCalledWith("/v1/userinfo", {
      credentials: "include",
    });
  });

  it("does not forward the apiFetch-only flags (escalate / retryAfterAuth) to fetch", async () => {
    fetchMock.mockResolvedValue(makeRes({ status: 200 }));

    await apiFetch("/v1/userinfo", {
      escalate: "prompt",
      retryAfterAuth: true,
    });

    expect(fetchMock).toHaveBeenCalledWith("/v1/userinfo", {
      credentials: "same-origin",
    });
  });
});

describe("apiFetch success / non-reauth responses", () => {
  it("returns a 2xx Response as-is and never opens the gate", async () => {
    const res = makeRes({ status: 200 });
    fetchMock.mockResolvedValue(res);

    await expect(apiFetch("/v1/userinfo")).resolves.toBe(res);
    expect(mockedRequireAuth).not.toHaveBeenCalled();
  });

  it("returns a plain 401 (no Auth-Required header) without opening the gate", async () => {
    const res = makeRes({ status: 401 });
    fetchMock.mockResolvedValue(res);

    await expect(apiFetch("/v1/userinfo")).resolves.toBe(res);
    expect(mockedRequireAuth).not.toHaveBeenCalled();
  });

  it("returns a 403 (authorization failure) without opening the gate", async () => {
    const res = makeRes({ status: 403, headers: REAUTH_HEADER });
    fetchMock.mockResolvedValue(res);

    // isReauthRequired needs status === 401, so a 403 never triggers re-auth.
    await expect(apiFetch("/v1/userinfo")).resolves.toBe(res);
    expect(mockedRequireAuth).not.toHaveBeenCalled();
  });
});

describe("apiFetch re-auth gate (interactive)", () => {
  it("opens the gate on a 401 WITH Auth-Required: reauthenticate", async () => {
    const first = makeRes({ status: 401, headers: REAUTH_HEADER });
    const replay = makeRes({ status: 200 });
    fetchMock.mockResolvedValueOnce(first).mockResolvedValueOnce(replay);

    const out = await apiFetch("/v1/userinfo"); // GET → safe → retried

    expect(mockedRequireAuth).toHaveBeenCalledTimes(1);
    expect(out).toBe(replay);
  });

  it("cancels the 401 response body before re-authenticating", async () => {
    const first = makeRes({ status: 401, headers: REAUTH_HEADER });
    fetchMock.mockResolvedValueOnce(first).mockResolvedValueOnce(makeRes({ status: 200 }));

    await apiFetch("/v1/userinfo");

    expect((first.body as unknown as { cancel: jest.Mock }).cancel).toHaveBeenCalled();
  });

  it("retries safe GET requests after re-auth (fetch called twice with same opts)", async () => {
    fetchMock
      .mockResolvedValueOnce(makeRes({ status: 401, headers: REAUTH_HEADER }))
      .mockResolvedValueOnce(makeRes({ status: 200 }));

    await apiFetch("/v1/userinfo");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]).toEqual(["/v1/userinfo", { credentials: "same-origin" }]);
    expect(fetchMock.mock.calls[1]).toEqual(["/v1/userinfo", { credentials: "same-origin" }]);
  });

  it("does NOT replay a mutation (POST) by default; returns the original 401", async () => {
    const first = makeRes({ status: 401, headers: REAUTH_HEADER });
    fetchMock.mockResolvedValueOnce(first);

    const out = await apiFetch("/v1/guide/profile", { method: "POST" });

    expect(mockedRequireAuth).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no replay
    expect(out).toBe(first);
  });

  it("replays a mutation when retryAfterAuth:true is set (idempotent opt-in)", async () => {
    const replay = makeRes({ status: 200 });
    fetchMock
      .mockResolvedValueOnce(makeRes({ status: 401, headers: REAUTH_HEADER }))
      .mockResolvedValueOnce(replay);

    const out = await apiFetch("/v1/guide/profile", {
      method: "PUT",
      retryAfterAuth: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out).toBe(replay);
  });

  it("treats method case-insensitively when deciding retry (lowercase 'get' is safe)", async () => {
    fetchMock
      .mockResolvedValueOnce(makeRes({ status: 401, headers: REAUTH_HEADER }))
      .mockResolvedValueOnce(makeRes({ status: 200 }));

    await apiFetch("/v1/userinfo", { method: "get" });

    expect(fetchMock).toHaveBeenCalledTimes(2); // retried
  });

  it("propagates AuthCancelledError when the gate rejects (user dismisses modal)", async () => {
    fetchMock.mockResolvedValueOnce(makeRes({ status: 401, headers: REAUTH_HEADER }));
    const cancelled = new Error("cancelled");
    mockedRequireAuth.mockRejectedValueOnce(cancelled);

    await expect(apiFetch("/v1/userinfo")).rejects.toBe(cancelled);
    expect(fetchMock).toHaveBeenCalledTimes(1); // never retried
  });
});

// N3 renamed this mode: `escalate: "none"` is the public-resource opt-out. The genuinely
// "ambient" case (a background principal read) is now its own mode and raises a notice —
// see tests/unit/lib/http/escalation.test.ts.
describe('apiFetch public-resource mode (escalate: "none")', () => {
  it("returns a re-auth 401 as-is without opening the gate", async () => {
    const res = makeRes({ status: 401, headers: REAUTH_HEADER });
    fetchMock.mockResolvedValue(res);

    await expect(apiFetch("/v1/userinfo", { escalate: "none" })).resolves.toBe(res);
    expect(mockedRequireAuth).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never cancels the body in this mode (caller may read the 401)", async () => {
    const res = makeRes({ status: 401, headers: REAUTH_HEADER });
    fetchMock.mockResolvedValue(res);

    await apiFetch("/v1/userinfo", { escalate: "none" });

    expect((res.body as unknown as { cancel: jest.Mock }).cancel).not.toHaveBeenCalled();
  });
});
