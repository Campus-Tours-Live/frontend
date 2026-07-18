import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTourCatalog } from "@/lib/data-access/hooks/use-tour-catalog";

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

describe("useTourCatalog", () => {
  it("fetches /v1/tours with filters and unwraps the list", async () => {
    const tours = [
      {
        id: "tour-1",
        title: "Campus life",
        slug: "campus-life",
        topic: "GENERAL_CAMPUS",
      },
    ];
    fetchMock.mockResolvedValue(jsonResponse(200, { data: tours }));

    const { result } = renderHook(
      () =>
        useTourCatalog({
          q: "campus",
          topicIds: ["GENERAL_CAMPUS"],
          sort: "RATING",
          limit: 5,
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/tours?topic=GENERAL_CAMPUS&q=campus&sort=RATING&limit=5",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(tours);
  });

  it("is loading initially with no data", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTourCatalog(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("surfaces an error when the response is not ok", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, {}));

    const { result } = renderHook(() => useTourCatalog(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
