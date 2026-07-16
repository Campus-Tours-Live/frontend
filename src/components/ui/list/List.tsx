import { Children, isValidElement, type HTMLAttributes, type ReactNode } from "react";
import { Divider } from "../divider/Divider";

/**
 * List — a vertical index of related rows. Renders a semantic `<ul>`, wraps each child in its own
 * `<li>`, and (by default) inserts a hairline {@link Divider} between rows. Because List owns the
 * `<li>`, {@link ListItem} stays a plain content block, usable/wrappable anywhere.
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
  // toArray drops null/undefined/boolean children (e.g. a `cond ? <x/> : null` row) and flattens
  // nested arrays — so a hidden conditional row never renders an empty `<li>` (or a stray divider).
  const items = Children.toArray(children);
  return (
    <ul role="list" className={className} {...rest}>
      {items.map((child, index) => (
        <li key={isValidElement(child) ? child.key : index}>
          {child}
          {dividers && index < items.length - 1 ? <Divider inset /> : null}
        </li>
      ))}
    </ul>
  );
}
