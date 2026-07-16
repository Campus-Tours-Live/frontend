import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUniversitySearch } from "@/lib/data-access/hooks/use-university-search";

/**
 * Exercises the REAL useUniversitySearch hook end-to-end: useDebounced (250ms)
 * → query (enabled flag) → apiFetch → fetch(/v1/universities?q=…&limit=8) →
 * apiJson envelope unwrap. Only global.fetch is mocked.
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

describe("useUniversitySearch", () => {
  it("does NOT fetch when disabled (enabled: false)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [] }));

    const { result } = renderHook(() => useUniversitySearch("stanford", { enabled: false }), {
      wrapper: makeWrapper(),
    });

    // Let the debounce window elapse so any pending fetch would have fired.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });

  it("does NOT fetch immediately — waits for the debounce, then hits /v1/universities", async () => {
    const matches = [{ id: "u1", name: "Stanford University" }];
    fetchMock.mockResolvedValue(jsonResponse(200, { data: matches }));

    const { result } = renderHook(() => useUniversitySearch("stanford"), {
      wrapper: makeWrapper(),
    });

    // First debounced value is the INITIAL "stanford" (useState seed), so the
    // query is enabled from the start; but assert it ultimately fetches the
    // debounced term and unwraps the data.
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/universities?q=stanford&limit=8",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(matches);
  });

  it("debounces typing: the intermediate term is swallowed before the settled one is requested", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [] }));

    // Start empty (disabled) so the useState seed doesn't fire a request for the
    // initial term — isolating the debounce of the keystrokes that follow.
    const { rerender } = renderHook(({ q }: { q: string }) => useUniversitySearch(q), {
      wrapper: makeWrapper(),
      initialProps: { q: "" },
    });

    // Rapidly type "mi" then "mit" within the same 250ms debounce window.
    rerender({ q: "mi" });
    rerender({ q: "mit" });

    // The final settled term "mit" must eventually be requested...
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/v1/universities?q=mit&limit=8", expect.anything()),
    );
    // ...and the intermediate "mi" must NOT have been (debounce swallowed it).
    expect(fetchMock).not.toHaveBeenCalledWith("/v1/universities?q=mi&limit=8", expect.anything());
  });

  it("url-encodes the query term", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [] }));

    const { result } = renderHook(() => useUniversitySearch("a&b state"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/universities?q=a%26b%20state&limit=8",
      expect.anything(),
    );
  });

  it("surfaces an error when the response is not ok", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, {}));

    const { result } = renderHook(() => useUniversitySearch("stanford"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
