import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboard } from "@/lib/data-access/hooks/use-dashboard";

/**
 * Exercises the REAL useDashboard hook end-to-end: query → apiFetch →
 * fetch(/v1/dashboard) → apiJson envelope unwrap. Only global.fetch is mocked.
 */

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

describe("useDashboard", () => {
  it("fetches /v1/dashboard with same-origin credentials and unwraps data", async () => {
    const dashboard = {
      kind: "participant",
      participant: { firstName: "Ada" },
      nextTour: null,
      upcomingBookings: [],
      pendingActions: null,
      createdAt: "2026-01-15T09:30:00.000Z",
    };
    fetchMock.mockResolvedValue(jsonResponse(200, { data: dashboard }));

    const { result } = renderHook(() => useDashboard(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/dashboard",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(dashboard);
  });

  it("preserves the participant booking aggregate returned by Contract A", async () => {
    const dashboard = {
      kind: "participant",
      participant: { type: "STUDENT" },
      nextTour: {
        id: "bk_789",
        status: "CONFIRMED",
        scheduledStartAt: "2026-07-10T15:00:00Z",
        scheduledEndAt: "2026-07-10T16:00:00Z",
        durationMinutes: 60,
        tourOfferingId: "off_123",
        tourTitle: "Hidden gems of North Campus",
        guideName: "Maya Chen",
        guideResponseDeadline: null,
        universityName: "North Campus University",
        price: { amount: 4200, currency: "USD" },
      },
      upcomingBookings: [
        {
          id: "bk_790",
          status: "WAITING_FOR_GUIDE",
          scheduledStartAt: "2026-07-14T18:00:00Z",
          scheduledEndAt: "2026-07-14T19:30:00Z",
          durationMinutes: 90,
          tourOfferingId: "off_456",
          tourTitle: "Engineering quad tour",
          guideName: "Sam Rivera",
          guideResponseDeadline: "2026-07-12T18:00:00Z",
          universityName: "North Campus University",
          price: { amount: 6000, currency: "USD" },
        },
      ],
      pendingActions: { unreadMessages: 2 },
      createdAt: "2026-01-15T09:30:00.000Z",
    };
    fetchMock.mockResolvedValue(jsonResponse(200, { data: dashboard }));

    const { result } = renderHook(() => useDashboard(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(dashboard);
    expect(result.current.data?.kind).toBe("participant");
    if (result.current.data?.kind === "participant") {
      expect(result.current.data.nextTour?.scheduledStartAt).toBe("2026-07-10T15:00:00Z");
      expect(result.current.data.upcomingBookings[0]?.scheduledEndAt).toBe("2026-07-14T19:30:00Z");
      expect(result.current.data.pendingActions).toEqual({ unreadMessages: 2 });
    }
  });

  it("is loading initially with no data", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useDashboard(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("surfaces an error when the response is not ok", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, {}));

    const { result } = renderHook(() => useDashboard(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
