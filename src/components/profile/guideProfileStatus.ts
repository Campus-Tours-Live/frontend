import type { StatusVariant } from "@/components/ui";

export function applicationStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "PENDING":
      return "Pending verification";
    case "VERIFIED":
      return "Verified";
    case "REJECTED":
      return "Rejected";
    default:
      return status ?? "—";
  }
}

export function verificationStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "NOT_SUBMITTED":
      return "Not submitted";
    case "PENDING":
      return "Pending";
    case "VERIFIED":
      return "Verified";
    case "REJECTED":
      return "Rejected";
    default:
      return status ?? "—";
  }
}

export function applicationStatusVariant(status: string | null | undefined): StatusVariant {
  switch (status) {
    case "VERIFIED":
      return "success";
    case "PENDING":
      return "warning";
    case "REJECTED":
      return "error";
    default:
      return "info";
  }
}
