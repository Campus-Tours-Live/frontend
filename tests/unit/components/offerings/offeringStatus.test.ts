import {
  filterOfferings,
  offeringStatusLabel,
  offeringStatusVariant,
} from "@/components/offerings/offeringStatus";
import type { Offering, OfferingStatus } from "@/lib/data-access";

function offering(status: OfferingStatus): Offering {
  return {
    id: "1",
    title: "Tour",
    slug: "tour",
    status,
    topic: "GENERAL_CAMPUS",
    universityId: null,
    durationMin: 60,
    priceCents: 4200,
    currency: "USD",
  };
}

describe("offeringStatus helpers", () => {
  it("filterOfferings filters by status tab", () => {
    const rows = [offering("DRAFT"), offering("ACTIVE"), offering("ARCHIVED"), offering("PAUSED")];
    expect(filterOfferings(rows, "draft")).toHaveLength(1);
    expect(filterOfferings(rows, "published")).toHaveLength(1);
    expect(filterOfferings(rows, "paused")).toHaveLength(1);
    expect(filterOfferings(rows, "retired")).toHaveLength(1);
    expect(filterOfferings(rows, "all")).toHaveLength(4);
  });

  it.each([
    ["ACTIVE", "Published", "success"],
    ["DRAFT", "Draft", "warning"],
    ["PAUSED", "Paused", "info"],
    ["ARCHIVED", "Retired", "info"],
  ] as const)("maps %s to label %s and variant %s", (status, label, variant) => {
    expect(offeringStatusLabel(status)).toBe(label);
    expect(offeringStatusVariant(status)).toBe(variant);
  });
});
