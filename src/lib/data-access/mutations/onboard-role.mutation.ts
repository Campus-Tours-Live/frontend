import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError, postJson } from "../http";
import { queryKeys } from "../keys";
import { currentRoleValueSchema, provisionedUserSchema, roleSchema } from "../me.schema";
import type { ProvisionedMe, Role } from "../types";
import { getFreshMe } from "@/lib/http/getFreshMe";

/** The two roles a PENDING or PROVISIONED principal can onboard into. Narrower than the
 *  4-value `Role` — a staff account is never granted through this command. */
export type OnboardableRole = "GUIDE" | "PARTICIPANT";

/**
 * Runtime validator for the bff's `201` `POST /v1/users/me/roles/{guide|participant}` body
 * (Profile Contract v2 / CTL-97's onboarding command). Reuses the SAME atoms `meSchema` (Task 1)
 * validates `/v1/userinfo` with — `user`/`roles`/`currentRole` here are name-for-name the same
 * shapes — so the two validators cannot silently drift apart.
 *
 * `currentRole` is deliberately OPTIONAL here even though the bff contract guarantees it
 * (it sets `currentRole` post-conversion — see `onboard-role.mutation.ts`'s `toProvisionedMe`):
 * this validator fails closed on a WRONG `currentRole` (not `∈ roles`) but not on an ABSENT one,
 * so a bff regression that simply omits the field degrades to the documented `acquiredRole`
 * fallback instead of rejecting an otherwise-valid grant outright.
 */
export const onboardingCommandResponseSchema = z
  .object({
    accountState: z.literal("PROVISIONED"),
    user: provisionedUserSchema,
    roles: z.array(roleSchema).min(1),
    acquiredRole: currentRoleValueSchema,
    currentRole: currentRoleValueSchema.optional(),
    profile: z.record(z.string(), z.unknown()),
  })
  .superRefine((value, ctx) => {
    if (!value.roles.includes(value.acquiredRole)) {
      ctx.addIssue({
        code: "custom",
        message: "acquiredRole must be one of the granted roles",
        path: ["acquiredRole"],
      });
    }
    if (value.currentRole !== undefined && !value.roles.includes(value.currentRole)) {
      ctx.addIssue({
        code: "custom",
        message: "currentRole must be one of the granted roles",
        path: ["currentRole"],
      });
    }
  });

export type OnboardingCommandResponse = z.infer<typeof onboardingCommandResponseSchema>;

/** The typed outcome of the §4.3 reconcile flow — see `reconcile` below. */
export type ReconcileResult =
  | { status: "ACQUIRED"; me: ProvisionedMe }
  | { status: "STILL_PENDING" }
  | { status: "PROVISIONED_WITHOUT_ROLE"; me: ProvisionedMe };

/**
 * Thrown when reconcile finds the principal still `PENDING` after an ambiguous command result
 * (§4.3 `STILL_PENDING`) — the role grant's fate is genuinely unknown, so the caller should keep
 * the form up and let the user resubmit, rather than render this as a hard failure the way every
 * other rejection is.
 */
export class OnboardRetryableError extends Error {
  constructor() {
    super("We couldn't confirm your role yet — please try again.");
    this.name = "OnboardRetryableError";
  }
}

/**
 * True when the command's failure leaves Core's commit state AMBIGUOUS — the only cases where
 * re-reading `/userinfo` can tell us something the command's own response couldn't:
 *  - `500 SESSION_CONVERSION_FAILED` — Core's write committed but the bff's post-conversion
 *    session/session-role sync failed (I11): the role may well be held already.
 *  - `409 ROLE_ALREADY_GRANTED` — the bff says the role is already held; confirm rather than
 *    trust a possibly-stale/duplicate submission.
 *  - anything that ISN'T a structured `ApiError` at all (a network timeout, a dropped
 *    connection, `fetch` throwing) — the request may never have reached the bff, or its
 *    response may never have reached us; either way Core's state is unknown.
 *
 * Every other case is TERMINAL by design, most importantly a generic `500` with no
 * `SESSION_CONVERSION_FAILED` code: the command may never have reached Core at all, so
 * reconciling would risk treating a role the user does NOT hold as acquired.
 */
function shouldReconcile(err: unknown): boolean {
  if (err instanceof ApiError) {
    if (err.status === 500 && err.code === "SESSION_CONVERSION_FAILED") return true;
    if (err.status === 409 && err.code === "ROLE_ALREADY_GRANTED") return true;
    return false;
  }
  return true;
}

/** Cache-write idiom shared by every path that resolves a fresh `ProvisionedMe` (the command's
 *  own 201, or a reconcile that confirms `ACQUIRED`) — mirrors `set-current-role.mutation.ts`:
 *  cancel any in-flight `["me"]` fetch FIRST (never patch-before-cancel), then patch the cache
 *  directly (no refetch), then invalidate the role-shaped `["dashboard"]` aggregate. */
async function patchMeCache(qc: QueryClient, me: ProvisionedMe): Promise<void> {
  await qc.cancelQueries({ queryKey: queryKeys.me() });
  qc.setQueryData(queryKeys.me(), me);
  qc.invalidateQueries({ queryKey: queryKeys.dashboard(), refetchType: "active" });
}

function toProvisionedMe(response: OnboardingCommandResponse): ProvisionedMe {
  return {
    accountState: "PROVISIONED",
    user: response.user,
    // `.min(1)` above is enforced at runtime; bridges the same TS-level gap as
    // `me.schema.ts`'s `provisionedMeSchema` transform (`Role[]` → the non-empty tuple
    // `ProvisionedMe.roles` declares) — not a cast that skips a check.
    roles: response.roles as unknown as readonly [Role, ...Role[]],
    // FROM the response — the bff sets `currentRole` post-conversion. Only fall back to
    // `acquiredRole` if the response is (contrary to the normal contract) missing it.
    currentRole: response.currentRole ?? response.acquiredRole,
  };
}

/**
 * The §4.3 reconcile flow: re-read `/userinfo` FRESH (never a stale-time refetch — see
 * `getFreshMe`) and classify what it shows into a {@link ReconcileResult}. Only called for the
 * three ambiguous failures `shouldReconcile` selects; every other failure is terminal without
 * ever reaching here.
 *
 * `getFreshMe()` itself is left to throw straight through (not caught here): a suspended
 * account, `ACCOUNT_STATE_INVALID`, or any other hard session failure it surfaces is a terminal
 * failure of the RECONCILE READ itself, not a reconcilable outcome — there is no `ReconcileResult`
 * that means "we couldn't even check."
 */
async function reconcile(role: OnboardableRole): Promise<ReconcileResult> {
  const fresh = await getFreshMe();

  if (fresh.accountState === "PROVISIONED") {
    return (fresh.roles as readonly Role[]).includes(role)
      ? { status: "ACQUIRED", me: fresh }
      : { status: "PROVISIONED_WITHOUT_ROLE", me: fresh };
  }
  return { status: "STILL_PENDING" };
}

/**
 * The onboarding COMMAND mutation (CTL-97 defer-provisioning): `POST
 * /v1/users/me/roles/{guide|participant}`.
 *
 * Resolves `Promise<ProvisionedMe>` ONLY when the target role is CONFIRMED held — either directly
 * from a `201` (validated against {@link onboardingCommandResponseSchema} before being trusted;
 * never a bare TS cast), or from a reconcile that classifies as `ACQUIRED`. Every other outcome
 * REJECTS:
 *  - a malformed `201` body (contract violation) — rejects WITHOUT ever reconciling (the request
 *    itself succeeded; this is not one of the three ambiguous-result triggers) and without
 *    patching a cache with data that hasn't been validated.
 *  - a terminal command failure (`409 ROLE_NOT_ELIGIBLE`, `422`, `404
 *    ACCOUNT_NOT_PROVISIONED`, a GENERIC `500`, any other 4xx) — rejects with the original
 *    `ApiError` (code + `properties` intact for the form/T4 to render).
 *  - a reconcile that resolves `STILL_PENDING` — rejects with {@link OnboardRetryableError} (the
 *    form stays up so the user can resubmit; this is NOT resolved as success).
 *  - a reconcile that resolves `PROVISIONED_WITHOUT_ROLE` — rejects with the ORIGINAL error
 *    (the command genuinely failed; the ambiguous signal was a false alarm).
 *  - `getFreshMe()` itself throwing (suspended/`ACCOUNT_STATE_INVALID`/session-invalid) —
 *    rejects with that error.
 */
export async function onboardRole(
  qc: QueryClient,
  role: OnboardableRole,
  body: unknown,
): Promise<ProvisionedMe> {
  let raw: unknown;
  try {
    raw = await postJson<unknown>(`/v1/users/me/roles/${role.toLowerCase()}`, body);
  } catch (err) {
    if (!shouldReconcile(err)) throw err;

    const result = await reconcile(role);
    if (result.status === "ACQUIRED") {
      await patchMeCache(qc, result.me);
      return result.me;
    }
    if (result.status === "STILL_PENDING") {
      throw new OnboardRetryableError();
    }
    // result.status === "PROVISIONED_WITHOUT_ROLE" — the ambiguous signal was a false alarm;
    // the command genuinely failed, so surface the ORIGINAL error, not a new one.
    throw err;
  }

  const parsed = onboardingCommandResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `onboardRole: 201 OnboardingCommandResponse failed validation: ${parsed.error.message}`,
    );
  }

  const me = toProvisionedMe(parsed.data);
  await patchMeCache(qc, me);
  return me;
}

/** Mutation-fn factory — same idiom as `setCurrentRoleMutation(qc)`. `retry: false`: a lost
 *  response's auto-retry would blindly replay the command against Core, risking a spurious
 *  `409 ROLE_ALREADY_GRANTED` for what should have been a single submission — whether to
 *  resubmit is decided ONLY by the reconcile flow above, never by React Query's retry. */
export const onboardRoleMutation = (qc: QueryClient) => ({
  mutationFn: (input: { role: OnboardableRole; body: unknown }) =>
    onboardRole(qc, input.role, input.body),
  retry: false as const,
});
