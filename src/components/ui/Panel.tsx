import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Heading } from "./Heading";
import { Body } from "./Body";

/**
 * Panel — a `card` split into a top `header` block and a bottom body (`children`) by a horizontal
 * rule. The shared shell behind the availability panels (Weekly hours / Availability calendar /
 * day detail): each supplies its own header + body content (and their padding); this only draws the
 * card and the divider between them.
 *
 * `divider` picks how far that rule reaches:
 *  - `"inset"` (default) — kept clear of the edges by the standard gutter, so it aligns with padded content.
 *  - `"full"` — edge to edge, touching the card's left/right borders;
 */
export interface PanelProps {
  /** Top block — a title/description, a nav, etc. Supplies its own padding. */
  header: ReactNode;
  /** Bottom block. Supplies its own padding. */
  children: ReactNode;
  divider?: "full" | "inset";
  /** Extra card classes (e.g. `lg:flex lg:h-full lg:flex-col`, `overflow-hidden`). */
  className?: string;
  role?: string;
  "aria-label"?: string;
}

export function Panel({
  header,
  children,
  divider = "inset",
  className,
  role,
  "aria-label": ariaLabel,
}: PanelProps) {
  return (
    <div className={cn("card", className)} role={role} aria-label={ariaLabel}>
      {header}
      <div
        aria-hidden
        className={cn("shrink-0 border-t border-border", divider === "inset" && "mx-5 sm:mx-6")}
      />
      {children}
    </div>
  );
}

/**
 * PanelHeader — the standard title/subtitle header for a {@link Panel} (Weekly hours / Bookable days
 * / Booking rules). Pass it to `Panel`'s `header` prop; panels with a non-title header (e.g. a
 * ‹ date › nav) pass their own node instead. `action` sits top-right of the title row (a toggle or
 * link); `children` render below the title block (an inline alert/notice) and bring their own top
 * margin.
 */
export interface PanelHeaderProps {
  /** Section title — the panel's `<h2>`. */
  title: ReactNode;
  /** Supporting line under the title. */
  subtitle?: ReactNode;
  /** Control aligned to the top-right of the title row (e.g. a toggle/link). */
  action?: ReactNode;
  /** Extra content below the title block (e.g. an inline alert). */
  children?: ReactNode;
  className?: string;
}

export function PanelHeader({ title, subtitle, action, children, className }: PanelHeaderProps) {
  return (
    <div className={cn("px-5 py-4 sm:px-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Heading as="h2" size="large">
            {title}
          </Heading>
          {subtitle != null ? (
            <Body size="small" color="muted" className="mt-1">
              {subtitle}
            </Body>
          ) : null}
        </div>
        {action != null ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}
