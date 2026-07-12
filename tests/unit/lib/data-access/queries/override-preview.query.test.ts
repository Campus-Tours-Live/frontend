import { overridePreviewOptions } from "@/lib/data-access/queries/override-preview.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

const params = {
  dateFrom: "2026-08-01",
  dateTo: "2026-08-03",
  kind: "UNAVAILABLE" as const,
  startLocal: "09:30",
  windowMin: 90,
};

describe("overridePreviewOptions", () => {
  it("uses the availabilityPreview(params) queryKey", () => {
    expect(overridePreviewOptions(params).queryKey).toEqual(queryKeys.availabilityPreview(params));
    expect(overridePreviewOptions(params).queryKey).toEqual(["availability-preview", params]);
  });

  it("is disabled (enabled: false) when params is null", () => {
    expect(overridePreviewOptions(null).enabled).toBe(false);
    expect(overridePreviewOptions(null).queryKey).toEqual(["availability-preview", null]);
  });

  it("is enabled when params is provided", () => {
    expect(overridePreviewOptions(params).enabled).toBe(true);
  });

  it("queryFn GETs /v1/availability/preview with dateFrom/dateTo/kind/startLocal/windowMin", async () => {
    const payload = {
      days: [
        {
          date: "2026-08-01",
          resultingWindows: [{ startAt: "2026-08-01T16:30:00Z", endAt: "2026-08-01T18:00:00Z" }],
          trimmed: [{ kind: "UNAVAILABLE", startLocal: "09:30", windowMin: 90 }],
        },
      ],
      valid: true,
      message: null,
    };
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = overridePreviewOptions(params).queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith(
      "/v1/availability/preview?dateFrom=2026-08-01&dateTo=2026-08-03&kind=UNAVAILABLE&startLocal=09%3A30&windowMin=90",
    );
    expect(result).toBe(payload);
  });
});
