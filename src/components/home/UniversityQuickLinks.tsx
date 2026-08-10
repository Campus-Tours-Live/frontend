"use client";

import { Map, MapPin, Ticket, Users } from "lucide-react";
import { Body, Caption, Card, Icon, Link } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * UniversityQuickLinks — the four entry points that sit under the universities banner: a way in by
 * popularity, by proximity, by availability, and by place.
 *
 * A tile renders as a `<Link>` once its destination exists and as a `<button>` until then. Only
 * "Browse by state" has a page so far. The distinction is deliberate: an anchor pointing at a
 * route that 404s is a broken link to a screen reader and to a crawler, while a button is
 * focusable and keyboard-operable today. Adding an `href` to the data is all it takes to promote
 * the rest.
 *
 * Rendered as a list because that is what it is — four sibling choices of equal weight. Screen
 * readers announce the count, which a row of loose divs would not.
 */
interface QuickLink {
  label: string;
  hint: string;
  icon: typeof Users;
  /** Present only once the destination exists; see the note above on buttons vs anchors. */
  href?: string;
}

const QUICK_LINKS: QuickLink[] = [
  /**
   * "Most applied to", not "Popular" or "Most viewed".
   *
   * The ranking behind this tile is IPEDS undergraduate application volume — a real, official
   * figure. It is not a view count: we do not instrument views, so the old "Most viewed by
   * students" was a claim nothing in the system could support.
   */
  { label: "Most applied to", hint: "Highest application volume", icon: Users },
  { label: "Universities near you", hint: "Explore local campuses", icon: MapPin },
  { label: "Universities with tours", hint: "Tours available now", icon: Ticket },
  {
    label: "Browse by state",
    hint: "Explore by location",
    icon: Map,
    href: "/universities/browse-by-state",
  },
];

export function UniversityQuickLinks({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        // One per row on a phone, paired on small tablets, all four across from lg. The break
        // points follow the tile's own content — label plus hint need roughly 260px before the
        // text starts wrapping awkwardly — rather than any particular device width.
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {QUICK_LINKS.map(({ label, hint, icon, href }) => {
        // The tile fills the card so the whole thing is the hit area, not just the text.
        // `min-h-16` keeps it well past the 44px touch-target floor at every size.
        const tileClass =
          "flex min-h-16 w-full items-center gap-3 rounded-card px-4 py-3 text-left no-underline transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-soft";

        const inner = (
          <>
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-canvas text-primary"
            >
              <Icon icon={icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <Body as="span" size="small" weight={700} className="block truncate">
                {label}
              </Body>
              <Caption as="span" color="muted" className="block truncate">
                {hint}
              </Caption>
            </span>
            <Icon name="chevronRight" className="shrink-0 text-ink-soft" />
          </>
        );

        return (
          <Card as="li" key={label} padded={false}>
            {href ? (
              <Link href={href} className={tileClass}>
                {inner}
              </Link>
            ) : (
              <button type="button" className={tileClass}>
                {inner}
              </button>
            )}
          </Card>
        );
      })}
    </ul>
  );
}
