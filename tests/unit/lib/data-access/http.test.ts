import { apiJson, deleteJson, patchJson, postJson, ApiError } from "@/lib/data-access/http";
import { apiFetch } from "@/lib/http";

jest.mock("@/lib/http", () => ({ apiFetch: jest.fn() }));

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

/** Build a minimal Response-like object for apiFetch to resolve with. */
function makeRes(opts: { ok: boolean; status: number; json?: unknown }) {
  return {
    ok: opts.ok,
    status: opts.status,
    json: jest.fn().mockResolvedValue(opts.json),
  } as unknown as Response;
}

beforeEach(() => {
  mockedApiFetch.mockReset();
});

describe("ApiError", () => {
  it("is an instanceof Error", () => {
    const err = new ApiError(404);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('has name "ApiError" and carries the status', () => {
    const err = new ApiError(403, "Forbidden");
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(403);
    expect(err.message).toBe("Forbidden");
  });

  it("defaults the message to `HTTP <status>` when none is provided", () => {
    const err = new ApiError(500);
    expect(err.message).toBe("HTTP 500");
  });
});

describe("apiJson", () => {
  it("unwraps the `{ data }` envelope and returns json.data", async () => {
    const payload = { id: 1, name: "Alice" };
    mockedApiFetch.mockResolvedValue(makeRes({ ok: true, status: 200, json: { data: payload } }));

    await expect(apiJson("/v1/thing")).resolves.toEqual(payload);
  });

  it("returns the whole json when there is no `data` key", async () => {
    const payload = { id: 1, name: "Alice" };
    mockedApiFetch.mockResolvedValue(makeRes({ ok: true, status: 200, json: payload }));

    await expect(apiJson("/v1/thing")).resolves.toEqual(payload);
  });

  it("returns the whole json when `data` is null/undefined (nullish coalescing)", async () => {
    const payload = { data: null, other: 5 };
    mockedApiFetch.mockResolvedValue(makeRes({ ok: true, status: 200, json: payload }));

    // json.data is null → ?? falls back to the whole json object.
    await expect(apiJson("/v1/thing")).resolves.toEqual(payload);
  });

  it("throws ApiError with the right status on a non-2xx response", async () => {
    mockedApiFetch.mockResolvedValue(makeRes({ ok: false, status: 422 }));

    await expect(apiJson("/v1/thing")).rejects.toBeInstanceOf(ApiError);
    mockedApiFetch.mockResolvedValue(makeRes({ ok: false, status: 422 }));
    await expect(apiJson("/v1/thing")).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
    });
  });

  it("forwards the init through to apiFetch unchanged", async () => {
    mockedApiFetch.mockResolvedValue(makeRes({ ok: true, status: 200, json: { data: {} } }));
    const init = {
      method: "DELETE",
      headers: { "X-Test": "1" },
    } as const;

    await apiJson("/v1/thing", init);

    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
    expect(mockedApiFetch).toHaveBeenCalledWith("/v1/thing", init);
  });

  it("does not read the body when the response is not ok", async () => {
    const res = makeRes({ ok: false, status: 500 });
    mockedApiFetch.mockResolvedValue(res);

    await expect(apiJson("/v1/thing")).rejects.toBeInstanceOf(ApiError);
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("patchJson", () => {
  it("calls apiFetch with PATCH, Content-Type application/json and a stringified body", async () => {
    const body = { a: 1, b: "two" };
    mockedApiFetch.mockResolvedValue(
      makeRes({ ok: true, status: 200, json: { data: { ok: true } } }),
    );

    const result = await patchJson("/v1/participant/profile", body);

    expect(result).toEqual({ ok: true });
    expect(mockedApiFetch).toHaveBeenCalledWith("/v1/participant/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  });

  it("propagates ApiError from a failed PATCH", async () => {
    mockedApiFetch.mockResolvedValue(makeRes({ ok: false, status: 403 }));

    await expect(patchJson("/v1/guide/profile", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
    });
  });
});

describe("postJson", () => {
  it("calls apiFetch with POST, Content-Type application/json and a stringified body", async () => {
    const body = { role: "GUIDE" };
    mockedApiFetch.mockResolvedValue(
      makeRes({ ok: true, status: 200, json: { data: { role: "GUIDE" } } }),
    );

    const result = await postJson("/v1/session/active-role", body);

    expect(result).toEqual({ role: "GUIDE" });
    expect(mockedApiFetch).toHaveBeenCalledWith("/v1/session/active-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  });

  it("propagates ApiError from a failed POST", async () => {
    mockedApiFetch.mockResolvedValue(makeRes({ ok: false, status: 422 }));

    await expect(postJson("/v1/session/active-role", { role: "STAFF" })).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
    });
  });
});

describe("deleteJson", () => {
  it("calls apiFetch with DELETE and unwraps the response", async () => {
    mockedApiFetch.mockResolvedValue(makeRes({ ok: true, status: 200, json: { data: null } }));

    await deleteJson("/v1/guide/availability/rules/r1");

    expect(mockedApiFetch).toHaveBeenCalledWith("/v1/guide/availability/rules/r1", {
      method: "DELETE",
    });
  });

  it("propagates ApiError from a failed DELETE", async () => {
    mockedApiFetch.mockResolvedValue(makeRes({ ok: false, status: 404 }));

    await expect(deleteJson("/v1/guide/availability/rules/missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
    });
  });
});
