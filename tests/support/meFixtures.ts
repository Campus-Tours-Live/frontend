import type { PendingMe, ProvisionedMe, Role } from "@/lib/data-access/types";

/**
 * Test-only `Me` builders (CTL-97 discriminated union). Centralised so fixtures across layout /
 * hook / component tests all produce a shape that actually satisfies `meSchema` — hand-rolling a
 * partial `{ roles, currentRole }` object per test file is how these drifted from the real
 * contract in the first place.
 */
export function pendingMe(overrides: Partial<PendingMe["user"]> = {}): PendingMe {
  return {
    accountState: "PENDING",
    user: {
      id: null,
      firstName: null,
      lastName: null,
      displayName: null,
      email: "pending@example.com",
      ...overrides,
    },
    roles: [],
    currentRole: null,
  };
}

export function provisionedMe(
  opts: {
    id?: string;
    roles?: readonly [Role, ...Role[]];
    currentRole?: Role | null;
  } & Partial<Omit<ProvisionedMe["user"], "id">> = {},
): ProvisionedMe {
  const { id = "u1", roles = ["PARTICIPANT"], currentRole, ...userOverrides } = opts;
  return {
    accountState: "PROVISIONED",
    user: {
      id,
      firstName: null,
      lastName: null,
      displayName: null,
      email: null,
      accountStatus: null,
      ageBand: null,
      createdAt: null,
      ...userOverrides,
    },
    roles,
    currentRole: currentRole === undefined ? (roles[0] ?? null) : currentRole,
  };
}
