import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateGuideProfile } from "@/lib/data-access/hooks/use-update-guide-profile";

/**
 * Exercises the REAL useUpdateGuideProfile mutation end-to-end: mutate → mutation
 * → patchJson → apiFetch → fetch(PATCH /v1/guide/profile) → apiJson unwrap →
 * onSuccess invalidates ["me"], ["guide-profile"], ["dashboard"]. Only global.fetch
 * is mocked.
 */

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

describe("useUpdateGuideProfile", () => {
  it("PATCHes /v1/guide/profile with the body and resolves with the updated profile", async () => {
    const update = { major: "CS", classYear: "2027", submit: true };
    const saved = { major: "CS", classYear: "2027", guideStatus: "SUBMITTED" };
    fetchMock.mockResolvedValue(jsonResponse(200, { data: saved }));

    const client = makeClient();
    const { result } = renderHook(() => useUpdateGuideProfile(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate(update);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/guide/profile",
      expect.objectContaining({
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      }),
    );
    expect(result.current.data).toEqual(saved);
  });

  it("invalidates me / guide-profile / dashboard caches on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: {} }));

    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateGuideProfile(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate({ major: "CS" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["me"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["guide-profile"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("rejects (isError) when the response is not ok and does not invalidate", async () => {
    fetchMock.mockResolvedValue(jsonResponse(422, {}));

    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateGuideProfile(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate({ major: "" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
