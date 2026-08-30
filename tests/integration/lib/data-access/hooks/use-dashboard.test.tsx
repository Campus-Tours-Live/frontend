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
