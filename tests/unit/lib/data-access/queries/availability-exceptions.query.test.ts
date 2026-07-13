import { availabilityExceptionsOptions } from "@/lib/data-access/queries/availability-exceptions.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("availabilityExceptionsOptions", () => {
  it("uses the availabilityExceptions queryKey", () => {
    expect(availabilityExceptionsOptions().queryKey).toEqual(queryKeys.availabilityExceptions());
    expect(availabilityExceptionsOptions().queryKey).toEqual(["availability-exceptions"]);
  });

  it("queryFn GETs /v1/availability/exceptions and returns the resolved value", async () => {
    const payload = [
      {
        id: "e1",
        exceptionDate: "2026-07-04",
        kind: "UNAVAILABLE",
        startLocal: "00:00",
        windowMin: 1440,
        reason: null,
      },
    ];
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = availabilityExceptionsOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/availability/exceptions");
    expect(result).toBe(payload);
  });
});
