import { offeringSlotsOptions } from "@/lib/data-access/queries/offering-slots.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("offeringSlotsOptions", () => {
  it("uses the offeringSlots(offeringId) queryKey", () => {
    expect(offeringSlotsOptions("o1").queryKey).toEqual(queryKeys.offeringSlots("o1"));
    expect(offeringSlotsOptions("o1").queryKey).toEqual(["offering-slots", "o1"]);
  });

  it("queryFn GETs /v1/offerings/{id}/slots and returns the resolved value", async () => {
    const payload = [{ startAt: "2026-07-12T14:00:00Z", endAt: "2026-07-12T15:00:00Z" }];
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = offeringSlotsOptions("o1").queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/offerings/o1/slots");
    expect(result).toBe(payload);
  });

  it("encodes the offering id into the path", async () => {
    mockedApiJson.mockResolvedValue([] as never);

    const queryFn = offeringSlotsOptions("offering/1").queryFn as () => Promise<unknown>;
    await queryFn();

    expect(mockedApiJson).toHaveBeenCalledWith("/v1/offerings/offering%2F1/slots");
  });

  it("defaults enabled to true", () => {
    expect(offeringSlotsOptions("o1").enabled).toBe(true);
  });

  it("respects an explicit enabled flag", () => {
    expect(offeringSlotsOptions("o1", false).enabled).toBe(false);
  });
});
