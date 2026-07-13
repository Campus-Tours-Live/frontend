import { overrideMultiPreviewOptions } from "@/lib/data-access/queries/override-multi-preview.query";
import { postJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ postJson: jest.fn() }));

const mockedPostJson = postJson as jest.MockedFunction<typeof postJson>;

beforeEach(() => {
  mockedPostJson.mockReset();
});

const params = {
  dateFrom: "2026-08-01",
  dateTo: "2026-08-03",
  kind: "UNAVAILABLE" as const,
  windows: [
    { startLocal: "09:30", windowMin: 90 },
    { startLocal: "13:00", windowMin: 60 },
  ],
};

describe("overrideMultiPreviewOptions", () => {
  it("uses the availabilityPreviewMulti(params) queryKey", () => {
    expect(overrideMultiPreviewOptions(params).queryKey).toEqual(
      queryKeys.availabilityPreviewMulti(params),
    );
    expect(overrideMultiPreviewOptions(params).queryKey).toEqual([
      "availability-preview-multi",
      params,
    ]);
  });

  it("is disabled (enabled: false) when params is null", () => {
    expect(overrideMultiPreviewOptions(null).enabled).toBe(false);
    expect(overrideMultiPreviewOptions(null).queryKey).toEqual([
      "availability-preview-multi",
      null,
    ]);
  });

  it("is disabled (enabled: false) when windows is empty", () => {
    const empty = { ...params, windows: [] };
    expect(overrideMultiPreviewOptions(empty).enabled).toBe(false);
  });

  it("is enabled when params has at least one window", () => {
    expect(overrideMultiPreviewOptions(params).enabled).toBe(true);
  });

  it("queryFn POSTs the {dateFrom,dateTo,kind,windows} body to /v1/availability/preview", async () => {
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
    mockedPostJson.mockResolvedValue(payload as never);

    const queryFn = overrideMultiPreviewOptions(params).queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedPostJson).toHaveBeenCalledTimes(1);
    expect(mockedPostJson).toHaveBeenCalledWith("/v1/availability/preview", {
      dateFrom: "2026-08-01",
      dateTo: "2026-08-03",
      kind: "UNAVAILABLE",
      windows: [
        { startLocal: "09:30", windowMin: 90 },
        { startLocal: "13:00", windowMin: 60 },
      ],
    });
    expect(result).toBe(payload);
  });
});
