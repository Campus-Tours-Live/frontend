import type { Me, PendingMe, ProvisionedMe, Role } from "@/lib/data-access/types";

/**
 * TYPE-LEVEL tests for the CTL-97 discriminated `Me` union. No `expectTypeOf`/`tsd` dependency
 * in this repo, so this uses the standard dependency-free "type equality" trick (function-type
 * distributivity) instead — real assertions, just checked by `tsc --noEmit`, not at runtime. A
 * mismatch fails the BUILD (this file won't compile), not a jest assertion; the `it` bodies below
 * only exist so this file is picked up as a test and its (trivial) runtime behaviour is exercised
 * too.
 */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// `PendingMe.user.id` is exactly `null` (never a string).
type _PendingIdIsNull = Expect<Equal<PendingMe["user"]["id"], null>>;

// `ProvisionedMe.roles` is a non-empty readonly tuple, not a plain (possibly-empty) array.
type _ProvisionedRolesIsNonEmptyReadonlyTuple = Expect<
  Equal<ProvisionedMe["roles"], readonly [Role, ...Role[]]>
>;
// A plain `Role[]` must NOT satisfy that non-empty-tuple requirement (guards against a future
// regression back to a widened array that could legally be `[]`).
type _PlainRoleArrayIsNotTheSameShape = Expect<
  Equal<Role[] extends ProvisionedMe["roles"] ? true : false, false>
>;

// `PendingMe.roles` is exactly the empty tuple.
type _PendingRolesIsEmptyTuple = Expect<Equal<PendingMe["roles"], readonly []>>;

// `Me` is exactly the union of the two — narrowing on `accountState` must be exhaustive.
type _MeIsTheUnion = Expect<Equal<Me, PendingMe | ProvisionedMe>>;

/** Narrows `Me` on `accountState` — this function only TYPECHECKS if narrowing actually works:
 *  `roles[0]` is only known-defined once TS has narrowed to the non-empty tuple branch. */
function narrow(me: Me): Role | undefined {
  if (me.accountState === "PROVISIONED") {
    const first: Role = me.roles[0]; // compiles only because of the non-empty tuple
    const id: string = me.user.id; // compiles only because ProvisionedUser.id is `string`
    void id;
    return first;
  }
  const id: null = me.user.id; // compiles only because PendingUser.id is `null`
  const roles: readonly [] = me.roles; // compiles only because PendingMe.roles is `readonly []`
  void id;
  void roles; // an empty tuple has no index 0 to read — its emptiness IS the assertion
  return undefined;
}

describe("Me discriminated union — type-level", () => {
  it("narrows PROVISIONED → roles[0]: Role, user.id: string (compile-time checked above)", () => {
    const result = narrow({
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
      roles: ["GUIDE"],
      currentRole: null,
    });
    expect(result).toBe("GUIDE");
  });

  it("narrows PENDING → user.id: null, roles: readonly [] (compile-time checked above)", () => {
    const result = narrow({
      accountState: "PENDING",
      user: {
        id: null,
        firstName: null,
        lastName: null,
        displayName: null,
        email: null,
        accountStatus: null,
        ageBand: null,
        createdAt: null,
      },
      roles: [],
      currentRole: null,
    });
    expect(result).toBeUndefined();
  });
});
