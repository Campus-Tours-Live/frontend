import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSetCurrentRole } from "@/lib/data-access/hooks/use-set-current-role";
import { provisionedMe } from "../../../../support/meFixtures";

/**
 * Exercises the REAL useSetCurrentRole mutation end-to-end: mutate → mutation →
 * postJson → apiFetch → fetch(POST /v1/session/current-role) → apiJson unwrap →
 * onSuccess patches the cached ["me"] with the returned currentRole (no refetch) and
 * invalidates ["dashboard"]. Only global.fetch is mocked.
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

describe("useSetCurrentRole", () => {
  it("POSTs /v1/session/current-role with the role body and resolves with the lean { currentRole }", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { currentRole: "GUIDE" } }));

    const client = makeClient();
    const { result } = renderHook(() => useSetCurrentRole(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate("GUIDE");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/session/current-role",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "GUIDE" }),
      }),
    );
    expect(result.current.data).toEqual({ currentRole: "GUIDE" });
  });

  it("patches the cached me.currentRole (unwrapped Me shape) and invalidates [dashboard] only — no /userinfo refetch", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { currentRole: "GUIDE" } }));

    const client = makeClient();
    // Seed the cache the way `me.query.ts` does — the UNWRAPPED Me, not an envelope.
    const seeded = provisionedMe({ roles: ["PARTICIPANT", "GUIDE"], currentRole: "PARTICIPANT" });
    client.setQueryData(["me"], seeded);
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSetCurrentRole(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate("GUIDE");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The cache is patched in place — currentRole flips, everything else survives.
    expect(client.getQueryData(["me"])).toEqual({ ...seeded, currentRole: "GUIDE" });
    // ["dashboard"] still invalidates (role-shaped aggregate); ["me"] is patched, not invalidated.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ["me"] });
  });

  it("rejects (isError) when the response is not ok and does not patch or invalidate", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, {}));

    const client = makeClient();
    client.setQueryData(
      ["me"],
      provisionedMe({ roles: ["PARTICIPANT", "GUIDE"], currentRole: "PARTICIPANT" }),
    );
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSetCurrentRole(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate("ADMIN");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
    // A rejected switch must not patch the cache — the active role did not actually change.
    expect(client.getQueryData(["me"])).toMatchObject({ currentRole: "PARTICIPANT" });
  });
});
