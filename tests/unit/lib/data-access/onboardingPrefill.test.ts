import { getOnboardingPrefill } from "@/lib/data-access/onboardingPrefill";
import { pendingMe, provisionedMe } from "../../../support/meFixtures";

/**
 * `getOnboardingPrefill` feeds the onboarding forms' name/email prefill (Task 4 wires the
 * forms up to it). Branches on `accountState`: a PendingMe (first onboarding, no Core account
 * yet) prefills from the pending IDENTITY claims; a ProvisionedMe (second-role acquisition)
 * prefills from the provisioned user record.
 */
describe("getOnboardingPrefill", () => {
  it("prefills from the pending identity claims for a PendingMe", () => {
    const me = pendingMe({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" });
    expect(getOnboardingPrefill(me)).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
    });
  });

  it("returns null names for a PendingMe with no name claims", () => {
    const me = pendingMe({ firstName: null, lastName: null });
    expect(getOnboardingPrefill(me)).toEqual({
      firstName: null,
      lastName: null,
      email: "pending@example.com",
    });
  });

  it("prefills from the provisioned user for a ProvisionedMe", () => {
    const me = provisionedMe({
      roles: ["PARTICIPANT"],
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
    });
    expect(getOnboardingPrefill(me)).toEqual({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
    });
  });

  it("returns nulls (not a crash) for a ProvisionedMe with no name/email on file", () => {
    const me = provisionedMe({ roles: ["GUIDE"] });
    expect(getOnboardingPrefill(me)).toEqual({
      firstName: null,
      lastName: null,
      email: null,
    });
  });
});
