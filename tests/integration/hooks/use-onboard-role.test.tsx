import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOnboardRole } from "@/hooks/use-onboard-role";
import { OnboardRetryableError } from "@/lib/data-access/mutations/onboard-role.mutation";
import { provisionedMe } from "../../support/meFixtures";

/**
 * Exercises the REAL useOnboardRole mutation end-to-end: mutate → onboardRoleMutation →
 * onboardRole → postJson → apiFetch → fetch(POST /v1/users/me/roles/{role}) → validate the 201
 * → patch ["me"] / invalidate ["dashboard"], OR (on the reconcile triggers) a second real fetch
 * to /v1/userinfo via the real, un-mocked getFreshMe. Only global.fetch is mocked.
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
  // No `defaultOptions.mutations.retry` override — this deliberately leaves React Query's
  // real default (3 retries client-side) in place, so the mutation's OWN `retry: false` is
  // what's under test, not a test harness that already disables retries for it.
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

describe("useOnboardRole", () => {
  it("POSTs /v1/users/me/roles/{role} (lowercased) with the body, patches ['me'], and invalidates ['dashboard']", async () => {
    const commandBody = {
      accountState: "PROVISIONED",
      user: {
        id: "u1",
        firstName: null,
        lastName: null,
        displayName: null,
        email: null,
        accountStatus: null,
        ageBand: null,
        createdAt: null,
      },
      roles: ["PARTICIPANT", "GUIDE"],
      acquiredRole: "GUIDE",
      currentRole: "GUIDE",
      profile: {},
    };
    fetchMock.mockResolvedValue(jsonResponse(201, { data: commandBody }));

    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useOnboardRole(), { wrapper: wrapperFor(client) });

    result.current.mutate({ role: "GUIDE", body: { bio: "I lead tours" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/users/me/roles/guide",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: "I lead tours" }),
      }),
    );
    expect(client.getQueryData(["me"])).toEqual({
      accountState: "PROVISIONED",
      user: commandBody.user,
      roles: ["PARTICIPANT", "GUIDE"],
      currentRole: "GUIDE",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"], refetchType: "active" });
  });

  it("retry: false — a terminal 422 rejects after exactly ONE POST, no auto-replay", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, { title: "Invalid profile", code: "VALIDATION_FAILED" }),
    );

    const client = makeClient();
    const { result } = renderHook(() => useOnboardRole(), { wrapper: wrapperFor(client) });

    result.current.mutate({ role: "PARTICIPANT", body: {} });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.error).toMatchObject({ status: 422, code: "VALIDATION_FAILED" });
  });

  it("reconciles a 500 SESSION_CONVERSION_FAILED via a real /v1/userinfo re-read and resolves once it confirms the role (I11 recovery)", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(500, {
          title: "Session conversion failed",
          code: "SESSION_CONVERSION_FAILED",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: provisionedMe({ roles: ["PARTICIPANT", "GUIDE"], currentRole: "GUIDE" }),
        }),
      );

    const client = makeClient();
    const { result } = renderHook(() => useOnboardRole(), { wrapper: wrapperFor(client) });

    result.current.mutate({ role: "GUIDE", body: {} });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [reconcilePath, reconcileInit] = fetchMock.mock.calls[1]!;
    expect(reconcilePath).toBe("/v1/userinfo");
    expect(reconcileInit).toMatchObject({ cache: "no-store" });
    expect(client.getQueryData(["me"])).toMatchObject({ currentRole: "GUIDE" });
  });

  it("reconciles a 500 SESSION_CONVERSION_FAILED to STILL_PENDING and rejects with a retryable error (form stays up)", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(500, {
          title: "Session conversion failed",
          code: "SESSION_CONVERSION_FAILED",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: {
            accountState: "PENDING",
            user: {
              id: null,
              firstName: null,
              lastName: null,
              displayName: null,
              email: "p@example.com",
            },
            roles: [],
            currentRole: null,
          },
        }),
      );

    const client = makeClient();
    const { result } = renderHook(() => useOnboardRole(), { wrapper: wrapperFor(client) });

    result.current.mutate({ role: "GUIDE", body: {} });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(OnboardRetryableError);
    expect(client.getQueryData(["me"])).toBeUndefined();
  });
});
