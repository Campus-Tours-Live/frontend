import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSetOnboardingRole } from "@/lib/data-access/hooks/use-set-onboarding-role";

/**
 * Exercises the REAL useSetOnboardingRole mutation end-to-end: mutate → mutation →
 * postJson → apiFetch → fetch(POST /v1/session/onboarding-role) → apiJson unwrap →
 * resolves with the lean { onboardingRole }. Only global.fetch is mocked.
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

describe("useSetOnboardingRole", () => {
  it("POSTs /v1/session/onboarding-role with the role body and resolves with the lean { onboardingRole }", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { onboardingRole: "GUIDE" } }));

    const client = makeClient();
    const { result } = renderHook(() => useSetOnboardingRole(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate("GUIDE");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/session/onboarding-role",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "GUIDE" }),
      }),
    );
    expect(result.current.data).toEqual({ onboardingRole: "GUIDE" });
  });

  it("rejects (isError) with the ApiError status on a 403 (not eligible)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(403, { title: "Parent or guardian accounts can't become guides." }),
    );

    const client = makeClient();
    const { result } = renderHook(() => useSetOnboardingRole(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate("GUIDE");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as { status?: number })?.status).toBe(403);
  });

  it("rejects (isError) with the ApiError status on a 409 (already held)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { title: "Role already held." }));

    const client = makeClient();
    const { result } = renderHook(() => useSetOnboardingRole(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate("PARTICIPANT");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as { status?: number })?.status).toBe(409);
  });
});
