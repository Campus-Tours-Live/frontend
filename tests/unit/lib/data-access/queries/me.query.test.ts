import { meOptions } from "@/lib/data-access/queries/me.query";
import { ApiError, apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";
import { provisionedMe } from "../../../../support/meFixtures";

// Keep the real ApiError class (me.query detects 401 via `instanceof ApiError`);
// only the network call (apiJson) is mocked.
jest.mock("@/lib/data-access/http", () => ({
  ...jest.requireActual("@/lib/data-access/http"),
  apiJson: jest.fn(),
}));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("meOptions", () => {
  it("uses the me queryKey", () => {
    expect(meOptions().queryKey).toEqual(queryKeys.me());
    expect(meOptions().queryKey).toEqual(["me"]);
  });

  it("queryFn fetches /v1/userinfo as an ambient read and returns the parsed Me on 200", async () => {
    const me = provisionedMe({ id: "me-1" });
    mockedApiJson.mockResolvedValue(me as never);

    const queryFn = meOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    // "ambient" (N3), not the old `interactive: false` and not a bare interactive call:
    // useMe only issues this once the session probe said authenticated, so a re-auth 401 is
    // a DEAD session that must be REPORTED — but through the banner, not by seizing a page
    // the user never asked to leave. See me-ambient.test.ts for that behaviour.
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/userinfo", { escalate: "ambient" });
    // `fetchMe` parses the response through the shared `meSchema` (same parser as
    // `getServerMe`) — the transform produces a new object, so this is a value check, not `toBe`.
    expect(result).toEqual(me);
  });

  it("returns null when the 200 body doesn't parse as a valid Me (fail-closed, same as getServerMe)", async () => {
    mockedApiJson.mockResolvedValue({ id: "me-1", roles: ["PARTICIPANT"] } as never);

    const queryFn = meOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(result).toBeNull();
  });

  it("returns null when apiJson throws an ApiError with status 401", async () => {
    mockedApiJson.mockRejectedValue(new ApiError(401, "Unauthorized"));

    const queryFn = meOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(result).toBeNull();
  });

  it("re-throws ApiError with a non-401 status", async () => {
    const error = new ApiError(500, "Server error");
    mockedApiJson.mockRejectedValue(error);

    const queryFn = meOptions().queryFn as () => Promise<unknown>;
    await expect(queryFn()).rejects.toBe(error);
  });

  it("re-throws non-ApiError errors (e.g. a 401-shaped plain object)", async () => {
    const error = new Error("network down");
    mockedApiJson.mockRejectedValue(error);

    const queryFn = meOptions().queryFn as () => Promise<unknown>;
    await expect(queryFn()).rejects.toBe(error);
  });
});
