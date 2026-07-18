import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMe } from "@/lib/data-access/hooks/use-me";

/**
 * Exercises the REAL useMe hook end-to-end: query → apiFetch → fetch(/v1/userinfo)
 * → apiJson envelope unwrap → fetchMe (401 → null). Only global.fetch is mocked.
 */

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** A minimal Response stand-in matching what apiFetch/apiJson read. */
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

describe("useMe", () => {
  it("requests /v1/userinfo with same-origin credentials", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { data: { id: "u1", roles: ["PARTICIPANT"], activeRole: "PARTICIPANT" } }),
    );

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.me).not.toBeNull());

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/userinfo",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("is loading initially with no data", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.me).toBeNull();
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.hasRole("PARTICIPANT")).toBe(false);
  });

  it("a 200 user with roles → me populated, isOnboarded true, hasRole correct", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        data: {
          id: "u1",
          roles: ["PARTICIPANT", "GUIDE"],
          activeRole: "GUIDE",
        },
      }),
    );

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.me).toMatchObject({ id: "u1", activeRole: "GUIDE" });
    expect(result.current.isOnboarded).toBe(true);
    expect(result.current.hasRole("PARTICIPANT")).toBe(true);
    expect(result.current.hasRole("GUIDE")).toBe(true);
    expect(result.current.hasRole("ADMIN")).toBe(false);
  });

  it("unwraps a bare (non-enveloped) body too", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { id: "u2", roles: ["GUIDE"], activeRole: "GUIDE" }),
    );

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.me).not.toBeNull());

    expect(result.current.me?.id).toBe("u2");
    expect(result.current.hasRole("GUIDE")).toBe(true);
  });

  it("a 401 → me null, isOnboarded false, hasRole false", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, {}));

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.me).toBeNull();
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.hasRole("PARTICIPANT")).toBe(false);
  });

  it("roles=[] → onboarded false even though me is present", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { data: { id: "u3", roles: [], activeRole: null } }),
    );

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.me).toMatchObject({ id: "u3" });
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.hasRole("PARTICIPANT")).toBe(false);
  });
});
