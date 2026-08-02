import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateParticipantProfile } from "@/lib/data-access/hooks/use-update-participant-profile";

/**
 * Exercises the REAL useUpdateParticipantProfile mutation end-to-end: mutate →
 * mutation → patchJson → apiFetch → fetch(PATCH /v1/participant/profile) →
 * apiJson unwrap → onSuccess invalidates ["me"], ["participant-profile"],
 * ["dashboard"]. Only global.fetch is mocked.
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

describe("useUpdateParticipantProfile", () => {
  it("PATCHes /v1/participant/profile with the body and resolves with the updated profile", async () => {
    const update = { firstName: "Ada", participantType: "STUDENT" };
    const saved = { firstName: "Ada", participantType: "STUDENT", email: "a@b.c" };
    fetchMock.mockResolvedValue(jsonResponse(200, { data: saved }));

    const client = makeClient();
    const { result } = renderHook(() => useUpdateParticipantProfile(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate(update);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/participant/profile",
      expect.objectContaining({
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      }),
    );
    expect(result.current.data).toEqual(saved);
  });

  it("invalidates me / participant-profile / dashboard caches on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: {} }));

    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateParticipantProfile(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate({ firstName: "Ada" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["me"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["participant-profile"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("rejects (isError) when the response is not ok and does not invalidate", async () => {
    fetchMock.mockResolvedValue(jsonResponse(422, {}));

    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateParticipantProfile(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate({ firstName: "" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
