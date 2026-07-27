import {
  applicationStatusLabel,
  applicationStatusVariant,
  verificationStatusLabel,
} from "@/components/profile/guideProfileStatus";

describe("guideProfileStatus helpers", () => {
  it.each([
    ["PENDING", "Pending verification", "warning"],
    ["VERIFIED", "Verified", "success"],
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

  it("falls back to the 'info' variant for unknown or missing application statuses", () => {
    expect(applicationStatusVariant(null)).toBe("info");
    expect(applicationStatusVariant("ON_HOLD")).toBe("info");
  });
});
