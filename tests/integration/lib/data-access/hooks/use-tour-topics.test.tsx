import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTourTopics } from "@/lib/data-access/hooks/use-tour-topics";

/**
 * Exercises the REAL useTourTopics hook end-to-end: query → apiFetch →
 * fetch(/v1/meta/tour-topics) → apiJson envelope unwrap. This is an ambient
 * (escalate: none) read. Only global.fetch is mocked.
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

describe("useTourTopics", () => {
  it("fetches /v1/meta/tour-topics with same-origin credentials and unwraps the list", async () => {
    const topics = [
      { value: "stem", label: "STEM" },
      { value: "arts", label: "Arts" },
    ];
    fetchMock.mockResolvedValue(jsonResponse(200, { data: topics }));

    const { result } = renderHook(() => useTourTopics(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/meta/tour-topics",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(topics);
  });

  it("is loading initially with no data", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useTourTopics(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("surfaces an error when the response is not ok", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, {}));

    const { result } = renderHook(() => useTourTopics(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
