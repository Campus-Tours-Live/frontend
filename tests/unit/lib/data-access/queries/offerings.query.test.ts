import { offeringsOptions } from "@/lib/data-access/queries/offerings.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("offeringsOptions", () => {
  it("uses the offerings queryKey", () => {
    expect(offeringsOptions().queryKey).toEqual(queryKeys.guideOfferings());
    expect(offeringsOptions().queryKey).toEqual(["guide-offerings"]);
  });

  it("queryFn fetches /v1/guide/offerings and returns the resolved value", async () => {
    const payload = [{ id: "o1", title: "Campus walk" }];
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = offeringsOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/guide/offerings");
    expect(result).toBe(payload);
  });
});
