import type { Offering, OfferingStatus } from "@/lib/data-access";

export type OfferingFilter = "all" | "draft" | "published" | "paused" | "retired";

export function filterOfferings(offerings: Offering[], filter: OfferingFilter): Offering[] {
  if (filter === "all") return offerings;
  if (filter === "draft") return offerings.filter((o) => o.status === "DRAFT");
  if (filter === "published") return offerings.filter((o) => o.status === "ACTIVE");
  if (filter === "paused") return offerings.filter((o) => o.status === "PAUSED");
  return offerings.filter((o) => o.status === "ARCHIVED");
}

export function offeringStatusLabel(status: OfferingStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Published";
    case "DRAFT":
      return "Draft";
    case "PAUSED":
      return "Paused";
    case "ARCHIVED":
      return "Retired";
  }
}

export function offeringStatusVariant(
  status: OfferingStatus,
): "success" | "warning" | "info" | "error" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "DRAFT":
      return "warning";
    case "PAUSED":
      return "info";
    case "ARCHIVED":
      return "info";
  }
}
