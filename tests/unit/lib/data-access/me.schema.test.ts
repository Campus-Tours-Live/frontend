import { meSchema } from "@/lib/data-access/me.schema";
import { pendingMe, provisionedMe } from "../../../support/meFixtures";

/**
 * Runtime coverage for the shared `meSchema` (CTL-97) — the SINGLE parser `getServerMe` and
 * `useMe`/`me.query.ts` both go through. Fail-closed cases matter as much as the happy path:
 * a body that doesn't structurally satisfy `Me` must never half-parse into something a consumer
 * could mistake for a real principal.
 */
describe("meSchema", () => {
  it("parses a valid PENDING body", () => {
    const body = pendingMe({ firstName: "Sam", email: "sam@example.com" });
    const result = meSchema.safeParse(body);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(body);
      expect(result.data.accountState).toBe("PENDING");
      expect(result.data.user.id).toBeNull();
      expect(result.data.roles).toEqual([]);
      expect(result.data.currentRole).toBeNull();
    }
  });

  it("parses a valid PROVISIONED body", () => {
    const body = provisionedMe({ id: "u1", roles: ["PARTICIPANT", "GUIDE"], currentRole: "GUIDE" });
    const result = meSchema.safeParse(body);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(body);
      expect(result.data.accountState).toBe("PROVISIONED");
      expect(result.data.user.id).toBe("u1");
      expect(result.data.roles).toEqual(["PARTICIPANT", "GUIDE"]);
    }
  });

  it("accepts a PROVISIONED body with currentRole: null", () => {
    const body = provisionedMe({ roles: ["ADMIN"], currentRole: null });
    expect(meSchema.safeParse(body).success).toBe(true);
  });

  it("FAILS a PROVISIONED body with an empty roles array (must hold ≥1 role)", () => {
    const body = { ...provisionedMe(), roles: [] };
    expect(meSchema.safeParse(body).success).toBe(false);
  });

  it("FAILS a PROVISIONED body whose currentRole is NOT among its held roles (fail-closed)", () => {
    const body = provisionedMe({ roles: ["PARTICIPANT"] });
    const tampered = { ...body, currentRole: "GUIDE" };

    const result = meSchema.safeParse(tampered);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "currentRole")).toBe(
        true,
      );
    }
  });

  it("FAILS a PROVISIONED body whose currentRole is a staff role (ADMIN/SUPPORT are never active)", () => {
    const body = provisionedMe({ roles: ["ADMIN"] });
    const tampered = { ...body, currentRole: "ADMIN" };

    expect(meSchema.safeParse(tampered).success).toBe(false);
  });

  it("FAILS a PROVISIONED body with a blank user.id", () => {
    const body = provisionedMe({ id: "" });
    expect(meSchema.safeParse(body).success).toBe(false);
  });

  it("FAILS a PENDING body with a non-null user.id", () => {
    const body = pendingMe();
    const tampered = { ...body, user: { ...body.user, id: "u1" } };
    expect(meSchema.safeParse(tampered).success).toBe(false);
  });

  it("FAILS a PENDING body with a non-empty roles array", () => {
    const body = { ...pendingMe(), roles: ["PARTICIPANT"] };
    expect(meSchema.safeParse(body).success).toBe(false);
  });

  it("FAILS a PENDING body with a non-null currentRole", () => {
    const body = { ...pendingMe(), currentRole: "PARTICIPANT" };
    expect(meSchema.safeParse(body).success).toBe(false);
  });

  it("FAILS on an unrecognized/missing accountState (no discriminant match)", () => {
    expect(meSchema.safeParse({ accountState: "SUSPENDED" }).success).toBe(false);
    expect(meSchema.safeParse({}).success).toBe(false);
    expect(meSchema.safeParse(null).success).toBe(false);
  });
});
