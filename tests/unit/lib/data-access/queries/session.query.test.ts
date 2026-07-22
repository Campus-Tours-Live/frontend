import { sessionOptions } from "@/lib/data-access/queries/session.query";
import { queryKeys } from "@/lib/data-access/keys";

/**
 * session.query.ts hits the BFF's GET /auth/session directly via global fetch (not apiJson —
 * it's a non-versioned path apiFetch would reject). Mock global.fetch the same way
 * tests/unit/lib/http/api.test.ts does for the sibling apiFetch layer.
 */
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

function makeRes(opts: { ok: boolean; body?: unknown; rejectJson?: boolean }): Response {
  return {
    ok: opts.ok,
    json: opts.rejectJson
      ? jest.fn().mockRejectedValue(new Error("bad json"))
      : jest.fn().mockResolvedValue(opts.body),
  } as unknown as Response;
}

describe("sessionOptions", () => {
  it("uses the session queryKey", () => {
    expect(sessionOptions().queryKey).toEqual(queryKeys.session());
    expect(sessionOptions().queryKey).toEqual(["session"]);
  });

  it("queryFn GETs /auth/session with same-origin credentials", async () => {
    fetchMock.mockResolvedValue(makeRes({ ok: true, body: { authenticated: true } }));

    const queryFn = sessionOptions().queryFn as () => Promise<boolean>;
    await queryFn();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/auth/session", { credentials: "same-origin" });
  });

  it("returns true when the body reports authenticated: true", async () => {
    fetchMock.mockResolvedValue(makeRes({ ok: true, body: { authenticated: true } }));

    const queryFn = sessionOptions().queryFn as () => Promise<boolean>;
    await expect(queryFn()).resolves.toBe(true);
  });

  it("returns false when the body reports authenticated: false", async () => {
    fetchMock.mockResolvedValue(makeRes({ ok: true, body: { authenticated: false } }));

    const queryFn = sessionOptions().queryFn as () => Promise<boolean>;
    await expect(queryFn()).resolves.toBe(false);
  });

  it("returns false when the body omits authenticated (Boolean(undefined))", async () => {
    fetchMock.mockResolvedValue(makeRes({ ok: true, body: {} }));

    const queryFn = sessionOptions().queryFn as () => Promise<boolean>;
    await expect(queryFn()).resolves.toBe(false);
  });

  it("returns false without reading the body when the response is not ok", async () => {
    const res = makeRes({ ok: false });
    fetchMock.mockResolvedValue(res);

    const queryFn = sessionOptions().queryFn as () => Promise<boolean>;
    await expect(queryFn()).resolves.toBe(false);
    expect(res.json as jest.Mock).not.toHaveBeenCalled();
  });

  it("fails closed (returns false) on a network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const queryFn = sessionOptions().queryFn as () => Promise<boolean>;
    await expect(queryFn()).resolves.toBe(false);
  });

  it("fails closed (returns false) when the response body is not valid JSON", async () => {
    fetchMock.mockResolvedValue(makeRes({ ok: true, rejectJson: true }));

    const queryFn = sessionOptions().queryFn as () => Promise<boolean>;
    await expect(queryFn()).resolves.toBe(false);
  });
});
