import { z } from "zod";
import type { Me, PendingMe, ProvisionedMe, Role } from "./types";

/**
 * The SINGLE runtime validator for `/v1/userinfo`'s discriminated-union response — used by
 * BOTH the server (`getServerMe`) and the client (`useMe`/`me.query.ts`). No second, hand-rolled
 * parser: a shape drift between server and client reads would be exactly the kind of bug this
 * schema exists to catch, so there is deliberately only one.
 *
 * Fail-closed by construction: `.safeParse` either returns a value that structurally satisfies
 * {@link Me} or fails — callers treat a parse failure as "no usable principal" (see `getServerMe`),
 * never as a best-effort partial `Me`.
 */

const ROLE_VALUES = ["PARTICIPANT", "GUIDE", "ADMIN", "SUPPORT"] as const satisfies readonly Role[];
const roleSchema = z.enum(ROLE_VALUES);

// `currentRole` is the ACTIVE consumer-facing role — narrower than the 4-value `Role` used for
// `roles` (a staff account's `currentRole` is never ADMIN/SUPPORT). Widened back to `Role | null`
// on the way out (via the transform below) to match `ProvisionedMe.currentRole`'s declared type.
const currentRoleValueSchema = z.enum(["GUIDE", "PARTICIPANT"]);

const pendingUserSchema = z.object({
  id: z.null(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  displayName: z.string().nullable(),
  email: z.string().nullable(),
  accountStatus: z.null(),
  ageBand: z.null(),
  createdAt: z.string().nullable(),
});

const provisionedUserSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  displayName: z.string().nullable(),
  email: z.string().nullable(),
  accountStatus: z.string().nullable(),
  ageBand: z.string().nullable(),
  createdAt: z.string().nullable(),
});

const pendingMeSchema = z
  .object({
    accountState: z.literal("PENDING"),
    user: pendingUserSchema,
    roles: z.tuple([]),
    currentRole: z.null(),
  })
  .transform((value): PendingMe => value);

const provisionedMeSchema = z
  .object({
    accountState: z.literal("PROVISIONED"),
    user: provisionedUserSchema,
    roles: z.array(roleSchema).min(1),
    currentRole: currentRoleValueSchema.nullable(),
  })
  // Fail-closed even though the bff should guarantee it: a `currentRole` the caller doesn't
  // actually hold is a contract violation we refuse to pass downstream (every consumer trusts
  // `currentRole ∈ roles` without re-checking it).
  .superRefine((value, ctx) => {
    if (value.currentRole !== null && !value.roles.includes(value.currentRole)) {
      ctx.addIssue({
        code: "custom",
        message: "currentRole must be one of the held roles",
        path: ["currentRole"],
      });
    }
  })
  .transform(
    (value): ProvisionedMe => ({
      ...value,
      // `.min(1)` above already guarantees non-emptiness at runtime; zod (v4) types `.min(1)`
      // as `Role[]`, not the non-empty tuple `readonly [Role, ...Role[]]` `ProvisionedMe` needs —
      // this cast just bridges that TS-level gap, it does not skip a check.
      roles: value.roles as unknown as readonly [Role, ...Role[]],
    }),
  );

export const meSchema = z.discriminatedUnion("accountState", [
  pendingMeSchema,
  provisionedMeSchema,
]);

// --- Compile-time single-source guard -----------------------------------------------------
// `types.ts`'s hand-written `Me` union is the public-facing, documented type; this schema is the
// runtime validator. Both must describe the SAME shape. A plain `z.infer` isn't used as `Me`
// itself (the hand-written interfaces above read far better at call sites and carry doc
// comments), so instead: assert mutual structural assignability here. If either side drifts,
// this file fails `tsc --noEmit` at these two lines, not silently at some unrelated call site.
type SchemaMe = z.infer<typeof meSchema>;
type AssertSchemaSatisfiesMe = SchemaMe extends Me
  ? true
  : ["SchemaMe does not satisfy Me", SchemaMe];
type AssertMeSatisfiesSchema = Me extends SchemaMe ? true : ["Me does not satisfy SchemaMe", Me];
const _assertSchemaSatisfiesMe: AssertSchemaSatisfiesMe = true;
const _assertMeSatisfiesSchema: AssertMeSatisfiesSchema = true;
