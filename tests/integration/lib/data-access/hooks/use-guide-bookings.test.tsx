import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGuideBookings } from "@/lib/data-access/hooks/use-guide-bookings";
import {
  useAcceptBooking,
  useDeclineBooking,
} from "@/lib/data-access/hooks/use-guide-booking-actions";

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

describe("useGuideBookings", () => {
  it("fetches the filtered guide bookings list", async () => {
    const rows = [{ id: "b1", status: "WAITING_FOR_GUIDE" }];
    fetchMock.mockResolvedValue(jsonResponse(200, { data: rows }));

    const { result } = renderHook(() => useGuideBookings("pending"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/guide/bookings?filter=pending",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(rows);
  });
});

describe("useAcceptBooking / useDeclineBooking", () => {
  it("accept posts to the accept endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { id: "b1", status: "CONFIRMED" } }));

    const { result } = renderHook(() => useAcceptBooking(), { wrapper: makeWrapper() });
    await result.current.mutateAsync("b1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/guide/bookings/b1/accept",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("decline posts to the decline endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { id: "b1", status: "CANCELLED" } }));

    const { result } = renderHook(() => useDeclineBooking(), { wrapper: makeWrapper() });
    await result.current.mutateAsync({ bookingId: "b1", body: { reason: "Busy" } });

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/guide/bookings/b1/decline",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
