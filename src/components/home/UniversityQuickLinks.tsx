"use client";

import { Map, MapPin, Ticket, Users } from "lucide-react";
import { Body, Caption, Card, Icon, Link } from "@/components/ui";
import { cn } from "@/lib/utils";

interface QuickLink {
  label: string;
  hint: string;
  icon: typeof Users;
  href?: string;
}

const QUICK_LINKS: QuickLink[] = [
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

const TILE_CLASS =
  "flex min-h-16 w-full items-center gap-3 rounded-card px-4 py-3 text-left no-underline transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-soft";

/** Four university-discovery shortcuts. */
export function UniversityQuickLinks({ className }: { className?: string }) {
  return (
    <ul className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {QUICK_LINKS.map(({ label, hint, icon, href }) => {
        const content = (
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
              <Link href={href} className={TILE_CLASS}>
                {content}
              </Link>
            ) : (
              <button type="button" className={TILE_CLASS}>
                {content}
              </button>
            )}
          </Card>
        );
      })}
    </ul>
  );
}
