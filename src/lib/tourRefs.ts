import type { TourSummary } from "./data-access";

const UUID_PREFIX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

function slugSegment(input: string | null | undefined): string {
  const slug = (input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tour";
}

/** Frontend-only public URL: keep the backend offering id parseable, with a human slug suffix. */
export function tourHref(tour: Pick<TourSummary, "id" | "slug" | "title">): string {
  return `/tours/${encodeURIComponent(`${tour.id}-${slugSegment(tour.slug || tour.title)}`)}`;
}

/** Extract the Contract-A offering id from a public route segment. Slugs are decorative only. */
export function tourIdFromRef(tourRef: string | null | undefined): string | null {
  if (!tourRef) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(tourRef);
  } catch {
    return null;
  }
  return decoded.match(UUID_PREFIX)?.[0] ?? null;
}
