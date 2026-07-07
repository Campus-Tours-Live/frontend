import {
  applicationStatusLabel,
  applicationStatusVariant,
  verificationStatusLabel,
} from "@/components/profile/guideProfileStatus";

describe("guideProfileStatus helpers", () => {
  it.each([
    ["DRAFT", "Draft", "info"],
    ["PENDING_REVIEW", "Pending review", "warning"],
    ["APPROVED", "Approved", "success"],
    ["REJECTED", "Rejected", "error"],
  ] as const)("maps application %s to %s / %s", (status, label, variant) => {
    expect(applicationStatusLabel(status)).toBe(label);
    expect(applicationStatusVariant(status)).toBe(variant);
  });

  it.each([
    ["NOT_SUBMITTED", "Not submitted"],
    ["PENDING", "Pending"],
    ["VERIFIED", "Verified"],
    ["REJECTED", "Rejected"],
  ] as const)("maps verification %s to %s", (status, label) => {
    expect(verificationStatusLabel(status)).toBe(label);
  });

  it("falls back to em dash for unknown or missing statuses", () => {
    expect(applicationStatusLabel(null)).toBe("—");
    expect(applicationStatusLabel("ON_HOLD")).toBe("ON_HOLD");
    expect(verificationStatusLabel(undefined)).toBe("—");
    expect(verificationStatusLabel("CUSTOM")).toBe("CUSTOM");
  });
});
