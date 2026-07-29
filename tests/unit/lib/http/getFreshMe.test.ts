import { getFreshMe } from "@/lib/http/getFreshMe";
import { ApiError, getJson } from "@/lib/data-access/http";
import { pendingMe, provisionedMe } from "../../../support/meFixtures";

// Keep the real ApiError (propagation is asserted via `instanceof`); only the network call
// (getJson) is mocked — the real meSchema does the parsing, exactly as production does.
jest.mock("@/lib/data-access/http", () => ({
  ...jest.requireActual("@/lib/data-access/http"),
  getJson: jest.fn(),
}));

const mockedGetJson = getJson as jest.MockedFunction<typeof getJson>;

beforeEach(() => {
  mockedGetJson.mockReset();
});

describe("getFreshMe", () => {
  it("fetches /v1/userinfo with cache: no-store (and a matching Cache-Control header), never a stale-time refetch", async () => {
    mockedGetJson.mockResolvedValue(pendingMe() as never);

    await getFreshMe();

    expect(mockedGetJson).toHaveBeenCalledTimes(1);
    const [path, init] = mockedGetJson.mock.calls[0]!;
    expect(path).toBe("/v1/userinfo");
    expect(init).toMatchObject({
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
  });

  it("resolves the parsed PendingMe (through the shared meSchema)", async () => {
    const me = pendingMe();
    mockedGetJson.mockResolvedValue(me as never);

    await expect(getFreshMe()).resolves.toEqual(me);
  });

  it("resolves the parsed ProvisionedMe (through the shared meSchema)", async () => {
    const me = provisionedMe({ roles: ["PARTICIPANT", "GUIDE"], currentRole: "GUIDE" });
    mockedGetJson.mockResolvedValue(me as never);

    await expect(getFreshMe()).resolves.toEqual(me);
  });

  it("throws when the body fails meSchema validation (fail-closed contract violation)", async () => {
    mockedGetJson.mockResolvedValue({ accountState: "PROVISIONED", roles: [] } as never);

    await expect(getFreshMe()).rejects.toThrow(/meSchema validation/);
  });

  it("rethrows a hard ApiError (e.g. a suspended/session-invalid failure) unchanged", async () => {
    const error = new ApiError(403, "Account suspended", "ACCOUNT_STATE_INVALID");
    mockedGetJson.mockRejectedValue(error);

    await expect(getFreshMe()).rejects.toBe(error);
  });

  it("rethrows a network failure (non-ApiError) unchanged", async () => {
    const error = new TypeError("Failed to fetch");
    mockedGetJson.mockRejectedValue(error);

    await expect(getFreshMe()).rejects.toBe(error);
  });
});
