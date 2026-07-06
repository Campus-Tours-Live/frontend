import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useCreateAvailabilityRule,
  useDeleteAvailabilityRule,
  useGuideAvailability,
  useUpdateBookingSettings,
} from "@/lib/data-access/hooks/use-guide-availability";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    body: null,
    json: async () => body,
  } as unknown as Response;
}

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const fetchMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("useGuideAvailability", () => {
  it("GETs /v1/guide/availability and returns the summary", async () => {
    const summary = {
      rules: [],
      exceptions: [],
      bookingSettings: { timezone: "America/Los_Angeles" },
    };
    fetchMock.mockResolvedValue(jsonResponse(200, { data: summary }));

    const client = makeClient();
    const { result } = renderHook(() => useGuideAvailability(), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/guide/availability",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(summary);
  });
});

describe("useCreateAvailabilityRule", () => {
  it("POSTs a rule and invalidates guide availability", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { id: "r1" } }));

    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateAvailabilityRule(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate({
      dayOfWeek: 1,
      startLocal: "09:00",
      endLocal: "17:00",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/guide/availability/rules",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          dayOfWeek: 1,
          startLocal: "09:00",
          endLocal: "17:00",
        }),
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["guide-availability"] });
  });
});

describe("useDeleteAvailabilityRule", () => {
  it("DELETEs a rule and invalidates guide availability", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: null }));

    const client = makeClient();
    const { result } = renderHook(() => useDeleteAvailabilityRule(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate("r1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/guide/availability/rules/r1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("useUpdateBookingSettings", () => {
  it("PATCHes booking settings", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { minNoticeMin: 720 } }));

    const client = makeClient();
    const { result } = renderHook(() => useUpdateBookingSettings(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate({ minNoticeMin: 720 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/guide/availability/booking-settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ minNoticeMin: 720 }),
      }),
    );
  });
});
