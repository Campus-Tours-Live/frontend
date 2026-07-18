import { availabilityRulesOptions } from "@/lib/data-access/queries/availability-rules.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("availabilityRulesOptions", () => {
  it("uses the availabilityRules queryKey", () => {
    expect(availabilityRulesOptions().queryKey).toEqual(queryKeys.availabilityRules());
    expect(availabilityRulesOptions().queryKey).toEqual(["availability-rules"]);
  });

  it("queryFn GETs /v1/availability/rules and returns the resolved value", async () => {
    const payload = [{ id: "r1", dayOfWeek: 1, startLocal: "09:00", windowMin: 480 }];
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = availabilityRulesOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/availability/rules");
    expect(result).toBe(payload);
  });
});
