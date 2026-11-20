import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBookingHistory } from "@/lib/data-access/hooks/use-booking-history";

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    body: null,
    json: async () => body,
  } as unknown as Response;
}

const fetchMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("useBookingHistory", () => {
  it("fetches /v1/bookings/history and unwraps the data array", async () => {
    const bookings = [
      {
        id: "bk_1",
        status: "COMPLETED",
        scheduledStartAt: "2026-05-18T14:00:00Z",
        scheduledEndAt: "2026-05-18T15:00:00Z",
        durationMinutes: 60,
        tourOfferingId: "off_1",
        tourTitle: "Campus life tour",
        guideName: "Maya Chen",
        guideResponseDeadline: null,
        universityName: "North Coast University",
        price: { amount: 4200, currency: "USD" },
      },
    ];
    fetchMock.mockResolvedValue(jsonResponse(200, { data: bookings }));

    const { result } = renderHook(() => useBookingHistory(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/bookings/history",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(bookings);
  });

  it("is loading initially with no data", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useBookingHistory(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("surfaces an error when the response is not ok", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, {}));

    const { result } = renderHook(() => useBookingHistory(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
