import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Body } from "./Body";

/**
 * ListItem — a single row's content for a {@link List}: an optional `leading` slot, an optional
 * prominent `title` over the main label (`children`), and an optional `trailing` slot. It's a plain
 * content block (not a bare `<li>` — {@link List} supplies the `<li>`), so it can be used or wrapped
 * anywhere. Spreads the rest of its attributes (`onClick`, `data-*`…) onto the element.
 */
export interface ListItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Main text label (the row's primary line, or the secondary line under `title`). */
  children?: ReactNode;
  /** Optional prominent title shown above the label. */
  title?: ReactNode;
  /** Left slot — e.g. an icon or avatar. */
  leading?: ReactNode;
  /** Right slot — e.g. a button, link, or status. */
  trailing?: ReactNode;
}

export function ListItem({
  leading,
  title,
  trailing,
  className,
  children,
  ...rest
}: ListItemProps) {
  return (
    <div className={cn("flex items-center gap-3 px-5 py-3.5 sm:px-6", className)} {...rest}>
      {leading != null ? <span className="flex shrink-0 items-center">{leading}</span> : null}
      <div className="min-w-0 flex-1">
        {title != null ? (
          <Body as="div" weight={600}>
            {title}
          </Body>
        ) : null}
        {children != null ? (
          <Body as="div" color={title != null ? "muted" : "ink"}>
            {children}
          </Body>
        ) : null}
      </div>
      {trailing != null ? <span className="flex shrink-0 items-center">{trailing}</span> : null}
    </div>
  );
}
