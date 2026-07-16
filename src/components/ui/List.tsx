import { type HTMLAttributes, type LiHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * List + ListItem — a semantic `<ul>`/`<li>` with a consistent row layout: an optional `leading`
 * slot (icon/avatar), the main `children`, and an optional `trailing` slot (action/status/link).
 * `List` draws hairline dividers between rows by default. Both spread the rest of their attributes
 * (`data-testid`, `id`, `onClick`, `data-*`…) onto the element, so instrumentation stays at the call
 * site while the row structure + a11y (`role="list"`) stay centralised.
 *
 * Selection state (radio/checkbox rows) is intentionally NOT baked in — keep this a display list and
 * compose an input/button inside `children`/`trailing` when a row needs to be interactive.
 */
export interface ListProps extends HTMLAttributes<HTMLUListElement> {
  /** Hairline rule between rows. Default `true`. */
  dividers?: boolean;
}

export function List({ dividers = true, className, children, ...rest }: ListProps) {
  return (
    <ul role="list" className={cn(dividers && "divide-y divide-border", className)} {...rest}>
      {children}
    </ul>
  );
}

export interface ListItemProps extends LiHTMLAttributes<HTMLLIElement> {
  /** Left slot — e.g. an icon or avatar. */
  leading?: ReactNode;
  /** Right slot — e.g. a button, link, or status. */
  trailing?: ReactNode;
}

export function ListItem({ leading, trailing, className, children, ...rest }: ListItemProps) {
  return (
    <li className={cn("flex items-center gap-3 px-5 py-3.5 sm:px-6", className)} {...rest}>
      {leading != null ? <span className="flex shrink-0 items-center">{leading}</span> : null}
      <div className="min-w-0 flex-1">{children}</div>
      {trailing != null ? <span className="flex shrink-0 items-center">{trailing}</span> : null}
    </li>
  );
}
