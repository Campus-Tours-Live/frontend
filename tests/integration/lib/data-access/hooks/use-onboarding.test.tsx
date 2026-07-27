import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOnboarding } from "@/lib/data-access/hooks/use-onboarding";

/**
 * Exercises the REAL useOnboarding hook end-to-end: query → apiFetch →
 * fetch(/v1/onboarding?role=…) → apiJson envelope unwrap. Only global.fetch is mocked.
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

describe("useOnboarding", () => {
  it("fetches /v1/onboarding?role=guide and unwraps data", async () => {
    const progress = {
      role: "guide",
      started: true,
      complete: false,
      canSubmit: false,
      guideStatus: "DRAFT",
      verificationStatus: null,
      steps: [{ key: "profile", label: "Profile", done: true }],
    };
    fetchMock.mockResolvedValue(jsonResponse(200, { data: progress }));

    const { result } = renderHook(() => useOnboarding("guide"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/onboarding?role=guide",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data).toEqual(progress);
  });

  it("encodes the participant role into the query string", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { role: "participant", steps: [] } }));

    const { result } = renderHook(() => useOnboarding("participant"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith("/v1/onboarding?role=participant", expect.anything());
  });

  it("surfaces an error when the response is not ok", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, {}));

    const { result } = renderHook(() => useOnboarding("guide"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
