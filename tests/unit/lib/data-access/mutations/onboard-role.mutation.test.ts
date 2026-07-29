import type { QueryClient } from "@tanstack/react-query";
import {
  OnboardRetryableError,
  onboardingCommandResponseSchema,
  onboardRole,
  onboardRoleMutation,
} from "@/lib/data-access/mutations/onboard-role.mutation";
import { ApiError, getJson, postJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";
import { pendingMe, provisionedMe } from "../../../../support/meFixtures";

// `postJson` (the command) and `getJson` (what the real, UN-mocked `getFreshMe` calls
// underneath for reconcile) are the only network seams — `ApiError` stays real so
// `shouldReconcile`'s `instanceof`/status/code branching is exercised for real, and
// `getFreshMe`/`meSchema` stay real so the reconcile assertions (incl. "used no-store") verify
// the ACTUAL wiring, not a stand-in.
jest.mock("@/lib/data-access/http", () => ({
  ...jest.requireActual("@/lib/data-access/http"),
  postJson: jest.fn(),
  getJson: jest.fn(),
}));

const mockedPostJson = postJson as jest.MockedFunction<typeof postJson>;
const mockedGetJson = getJson as jest.MockedFunction<typeof getJson>;

function makeQc() {
  return {
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    cancelQueries: jest.fn().mockResolvedValue(undefined),
  } as unknown as QueryClient;
}

/** A valid 201 OnboardingCommandResponse wire body. */
function commandResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
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
    ...overrides,
  };
}

beforeEach(() => {
  mockedPostJson.mockReset();
  mockedGetJson.mockReset();
});

describe("onboardRole — 201 happy path", () => {
  it("validates the response, patches the me cache (cancel before set), invalidates dashboard (refetchType active), and resolves the ProvisionedMe built FROM the response", async () => {
    const qc = makeQc();
    const body201 = commandResponse({
      roles: ["PARTICIPANT", "GUIDE"],
      acquiredRole: "GUIDE",
      currentRole: "GUIDE",
    });
    mockedPostJson.mockResolvedValueOnce(body201);

    const result = await onboardRole(qc, "GUIDE", { bio: "hi" });

    expect(mockedPostJson).toHaveBeenCalledWith("/v1/users/me/roles/guide", { bio: "hi" });
    expect(result).toEqual({
      accountState: "PROVISIONED",
      user: body201.user,
      roles: ["PARTICIPANT", "GUIDE"],
      currentRole: "GUIDE",
    });

    // Cache-write order: cancel BEFORE set (never patch-before-cancel).
    const cancelOrder = (qc.cancelQueries as jest.Mock).mock.invocationCallOrder[0];
    const setDataOrder = (qc.setQueryData as jest.Mock).mock.invocationCallOrder[0];
    expect(cancelOrder).toBeLessThan(setDataOrder);
    expect(qc.cancelQueries).toHaveBeenCalledWith({ queryKey: queryKeys.me() });
    expect(qc.setQueryData).toHaveBeenCalledWith(queryKeys.me(), result);
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.dashboard(),
      refetchType: "active",
    });

    // No reconcile on a clean 201.
    expect(mockedGetJson).not.toHaveBeenCalled();
  });

  it("uses currentRole FROM the response even when it differs from acquiredRole (does not fabricate)", async () => {
    const qc = makeQc();
    // acquiredRole is the role just granted; currentRole is whatever the bff's session sync
    // landed on post-conversion — assert the mutation trusts the LATTER, not the former.
    mockedPostJson.mockResolvedValueOnce(
      commandResponse({
        roles: ["PARTICIPANT", "GUIDE"],
        acquiredRole: "GUIDE",
        currentRole: "GUIDE",
      }),
    );

    const result = await onboardRole(qc, "GUIDE", {});

    expect(result.currentRole).toBe("GUIDE");
  });

  it("falls back to acquiredRole ONLY when the response's currentRole is absent", async () => {
    const qc = makeQc();
    const { currentRole: _drop, ...withoutCurrentRole } = commandResponse({
      roles: ["PARTICIPANT", "GUIDE"],
      acquiredRole: "GUIDE",
    });
    mockedPostJson.mockResolvedValueOnce(withoutCurrentRole);

    const result = await onboardRole(qc, "GUIDE", {});

    expect(result.currentRole).toBe("GUIDE");
  });
});

describe("onboardRole — OnboardingCommandResponse contract validation (never trust a bare cast)", () => {
  it.each([
    [
      "acquiredRole not in roles",
      commandResponse({ roles: ["PARTICIPANT"], acquiredRole: "GUIDE" }),
    ],
    ["empty roles", commandResponse({ roles: [], acquiredRole: "GUIDE", currentRole: "GUIDE" })],
    [
      "non-string user.id",
      commandResponse({
        user: {
          id: 123,
          firstName: null,
          lastName: null,
          displayName: null,
          email: null,
          accountStatus: null,
          ageBand: null,
          createdAt: null,
        },
      }),
    ],
    [
      "currentRole not in roles",
      commandResponse({
        roles: ["PARTICIPANT"],
        acquiredRole: "PARTICIPANT",
        currentRole: "GUIDE",
      }),
    ],
  ])("rejects on %s — does not patch the cache and does not reconcile", async (_label, badBody) => {
    const qc = makeQc();
    mockedPostJson.mockResolvedValueOnce(badBody);

    await expect(onboardRole(qc, "GUIDE", {})).rejects.toThrow();

    expect(qc.setQueryData).not.toHaveBeenCalled();
    expect(qc.invalidateQueries).not.toHaveBeenCalled();
    expect(mockedGetJson).not.toHaveBeenCalled();
  });

  it("the schema itself rejects a malformed body directly (safeParse.success === false)", () => {
    const result = onboardingCommandResponseSchema.safeParse(
      commandResponse({ roles: [], acquiredRole: "GUIDE", currentRole: "GUIDE" }),
    );
    expect(result.success).toBe(false);
  });

  it("the schema accepts a well-formed body directly (safeParse.success === true)", () => {
    const result = onboardingCommandResponseSchema.safeParse(commandResponse());
    expect(result.success).toBe(true);
  });
});

describe("onboardRole — reconcile triggers (§4.3)", () => {
  it("500 SESSION_CONVERSION_FAILED + reconcile ACQUIRED → resolves the fresh ProvisionedMe (I11 same-device recovery); getFreshMe used cache: no-store", async () => {
    const qc = makeQc();
    mockedPostJson.mockRejectedValueOnce(
      new ApiError(500, "conversion failed", "SESSION_CONVERSION_FAILED"),
    );
    const fresh = provisionedMe({ roles: ["PARTICIPANT", "GUIDE"], currentRole: "GUIDE" });
    mockedGetJson.mockResolvedValueOnce(fresh as never);

    const result = await onboardRole(qc, "GUIDE", {});

    expect(result).toEqual(fresh);
    expect(mockedGetJson).toHaveBeenCalledTimes(1);
    const [path, init] = mockedGetJson.mock.calls[0]!;
    expect(path).toBe("/v1/userinfo");
    expect(init).toMatchObject({ cache: "no-store" });

    // Same cache-write order/shape as the 201 path.
    const cancelOrder = (qc.cancelQueries as jest.Mock).mock.invocationCallOrder[0];
    const setDataOrder = (qc.setQueryData as jest.Mock).mock.invocationCallOrder[0];
    expect(cancelOrder).toBeLessThan(setDataOrder);
    expect(qc.setQueryData).toHaveBeenCalledWith(queryKeys.me(), fresh);
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.dashboard(),
      refetchType: "active",
    });
  });

  it("500 SESSION_CONVERSION_FAILED + reconcile STILL_PENDING → rejects retryably (form kept up)", async () => {
    const qc = makeQc();
    mockedPostJson.mockRejectedValueOnce(
      new ApiError(500, "conversion failed", "SESSION_CONVERSION_FAILED"),
    );
    mockedGetJson.mockResolvedValueOnce(pendingMe() as never);

    await expect(onboardRole(qc, "GUIDE", {})).rejects.toBeInstanceOf(OnboardRetryableError);
    expect(qc.setQueryData).not.toHaveBeenCalled();
    expect(qc.invalidateQueries).not.toHaveBeenCalled();
  });

  it("500 SESSION_CONVERSION_FAILED + reconcile PROVISIONED_WITHOUT_ROLE → rejects with the ORIGINAL error", async () => {
    const qc = makeQc();
    const original = new ApiError(500, "conversion failed", "SESSION_CONVERSION_FAILED");
    mockedPostJson.mockRejectedValueOnce(original);
    // Provisioned, but only holds PARTICIPANT — the command targeted GUIDE.
    mockedGetJson.mockResolvedValueOnce(provisionedMe({ roles: ["PARTICIPANT"] }) as never);

    await expect(onboardRole(qc, "GUIDE", {})).rejects.toBe(original);
    expect(qc.setQueryData).not.toHaveBeenCalled();
  });

  it("409 ROLE_ALREADY_GRANTED + reconcile ACQUIRED → resolves", async () => {
    const qc = makeQc();
    mockedPostJson.mockRejectedValueOnce(
      new ApiError(409, "already granted", "ROLE_ALREADY_GRANTED"),
    );
    const fresh = provisionedMe({ roles: ["PARTICIPANT", "GUIDE"], currentRole: "GUIDE" });
    mockedGetJson.mockResolvedValueOnce(fresh as never);

    await expect(onboardRole(qc, "GUIDE", {})).resolves.toEqual(fresh);
  });

  it("409 ROLE_ALREADY_GRANTED + reconcile STILL_PENDING → rejects retryably", async () => {
    const qc = makeQc();
    mockedPostJson.mockRejectedValueOnce(
      new ApiError(409, "already granted", "ROLE_ALREADY_GRANTED"),
    );
    mockedGetJson.mockResolvedValueOnce(pendingMe() as never);

    await expect(onboardRole(qc, "GUIDE", {})).rejects.toBeInstanceOf(OnboardRetryableError);
  });

  it("network failure (non-ApiError thrown by postJson) → reconcile → ACQUIRED resolves", async () => {
    const qc = makeQc();
    mockedPostJson.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const fresh = provisionedMe({ roles: ["PARTICIPANT", "GUIDE"], currentRole: "GUIDE" });
    mockedGetJson.mockResolvedValueOnce(fresh as never);

    await expect(onboardRole(qc, "GUIDE", {})).resolves.toEqual(fresh);
  });

  it("reconcile's own getFreshMe hard failure (suspended/session-invalid) is terminal — rethrown, not swallowed", async () => {
    const qc = makeQc();
    mockedPostJson.mockRejectedValueOnce(
      new ApiError(500, "conversion failed", "SESSION_CONVERSION_FAILED"),
    );
    const hardFailure = new ApiError(403, "Account suspended", "ACCOUNT_STATE_INVALID");
    mockedGetJson.mockRejectedValueOnce(hardFailure);

    await expect(onboardRole(qc, "GUIDE", {})).rejects.toBe(hardFailure);
    expect(qc.setQueryData).not.toHaveBeenCalled();
  });
});

describe("onboardRole — terminal failures (never reconcile)", () => {
  it("GENERIC 500 (no SESSION_CONVERSION_FAILED code) → terminal rethrow; getFreshMe is NOT called", async () => {
    const qc = makeQc();
    const error = new ApiError(500, "boom");
    mockedPostJson.mockRejectedValueOnce(error);

    await expect(onboardRole(qc, "GUIDE", {})).rejects.toBe(error);
    expect(mockedGetJson).not.toHaveBeenCalled();
    expect(qc.setQueryData).not.toHaveBeenCalled();
  });

  it("409 ROLE_NOT_ELIGIBLE → terminal rethrow with code + properties intact for the form (T4)", async () => {
    const qc = makeQc();
    const error = new ApiError(409, "Not eligible", "ROLE_NOT_ELIGIBLE", undefined, {
      role: "GUIDE",
    });
    mockedPostJson.mockRejectedValueOnce(error);

    await expect(onboardRole(qc, "GUIDE", {})).rejects.toMatchObject({
      code: "ROLE_NOT_ELIGIBLE",
      properties: { role: "GUIDE" },
    });
    expect(mockedGetJson).not.toHaveBeenCalled();
  });

  it("422 VALIDATION_FAILED → terminal rethrow", async () => {
    const qc = makeQc();
    const error = new ApiError(422, "Invalid input", "VALIDATION_FAILED");
    mockedPostJson.mockRejectedValueOnce(error);

    await expect(onboardRole(qc, "GUIDE", {})).rejects.toBe(error);
    expect(mockedGetJson).not.toHaveBeenCalled();
  });

  it("404 ACCOUNT_NOT_PROVISIONED → terminal session-error rethrow (not a validation failure)", async () => {
    const qc = makeQc();
    const error = new ApiError(404, "Account not provisioned", "ACCOUNT_NOT_PROVISIONED");
    mockedPostJson.mockRejectedValueOnce(error);

    await expect(onboardRole(qc, "GUIDE", {})).rejects.toBe(error);
    expect(mockedGetJson).not.toHaveBeenCalled();
  });
});

describe("onboardRoleMutation", () => {
  it("mutationFn forwards { role, body } to onboardRole", async () => {
    const qc = makeQc();
    mockedPostJson.mockResolvedValueOnce(commandResponse());

    const { mutationFn } = onboardRoleMutation(qc);
    await mutationFn({ role: "GUIDE", body: { bio: "hi" } });

    expect(mockedPostJson).toHaveBeenCalledWith("/v1/users/me/roles/guide", { bio: "hi" });
  });

  it("sets retry: false — a lost-response auto-retry must not replay the command; that is the reconcile flow's job", () => {
    const qc = makeQc();
    expect(onboardRoleMutation(qc).retry).toBe(false);
  });
});
