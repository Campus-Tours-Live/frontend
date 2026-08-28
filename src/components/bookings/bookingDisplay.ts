import type { StatusVariant } from "@/components/ui";

export function bookingStatusLabel(status: string): string {
  switch (status) {
    case "WAITING_FOR_GUIDE":
      return "Pending";
    case "CONFIRMED":
      return "Confirmed";
    case "CANCELLED":
      return "Declined / cancelled";
    default:
      return status;
  }
}

export function bookingStatusVariant(status: string): StatusVariant {
  switch (status) {
    case "WAITING_FOR_GUIDE":
      return "warning";
    case "CONFIRMED":
      return "success";
    default:
      return "info";
  }
}

export function formatBookingWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatBookingTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatDeadlineCountdown(
  deadlineIso: string | null | undefined,
  now = Date.now(),
): string | null {
  if (!deadlineIso) return null;
  const end = new Date(deadlineIso).getTime();
  if (Number.isNaN(end)) return null;
  const ms = end - now;
  if (ms <= 0) return "Response window expired";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m left to respond`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hours}h left to respond` : `${hours}h ${rem}m left to respond`;
}

export function bookingStatusEventLabel(reasonCode: string | null | undefined): string {
  switch (reasonCode) {
    case "PARTICIPANT_CREATED":
      return "Booking created";
    case "CART_ITEM_ADDED":
      return "Added to cart";
    case "CART_CHECKOUT":
      return "Submitted for guide review";
    case "GUIDE_ACCEPTED":
      return "Guide accepted";
    case "GUIDE_DECLINED":
      return "Guide declined";
    case "PARTICIPANT_CANCELLED":
      return "Participant cancelled";
    default:
      return reasonCode?.replaceAll("_", " ").toLowerCase() ?? "Status updated";
  }
}

export function bookingActorLabel(actor: string): string {
  switch (actor) {
    case "GUIDE":
      return "Guide";
    case "PARTICIPANT":
      return "Participant";
    case "SYSTEM":
      return "System";
    case "ADMIN":
      return "Admin";
    default:
      return actor;
  }
}

export function formatStatusEventWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
