import { Children, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Body } from "./Body";
import { Divider } from "./Divider";

/**
 * List + ListItem — a vertical index of related rows.
 *
 * `List` renders a semantic `<ul>`, wraps each child in its own `<li>`, and (by default) inserts a
 * hairline {@link Divider} between rows. Because List owns the `<li>`, {@link ListItem} stays a
 * plain content block — it can be used/wrapped anywhere without breaking list semantics.
 *
 *   <List>
 *     <ListItem leading={<Icon name="user" />} title="Ada" trailing={…}>Guide</ListItem>
 *     <ListItem>Cat</ListItem>
 *   </List>
 */
export interface ListProps extends HTMLAttributes<HTMLUListElement> {
  children: ReactNode;
  /** Hairline divider between rows. Default `true`. */
  dividers?: boolean;
}

export function List({ dividers = true, className, children, ...rest }: ListProps) {
  const count = Children.count(children);
  return (
    <ul role="list" className={className} {...rest}>
      {Children.map(children, (child, index) => (
        <li>
          {child}
          {dividers && index < count - 1 ? <Divider inset /> : null}
        </li>
      ))}
    </ul>
  );
}

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
