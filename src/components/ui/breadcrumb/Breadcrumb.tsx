import { Children, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Breadcrumb — secondary navigation showing the path back up a hierarchy. Wraps {@link BreadcrumbItem}
 * children in an ordered list with `/` separators, inside a labelled <nav>. Renders nothing when empty.
 *
 *   <Breadcrumb>
 *     <BreadcrumbItem href="/">Home</BreadcrumbItem>
 *     <BreadcrumbItem href="/tours">Tours</BreadcrumbItem>
 *     <BreadcrumbItem href="/tours/mit" isCurrent>MIT</BreadcrumbItem>
 *   </Breadcrumb>
 */
export interface BreadcrumbProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Accessible name for the nav landmark. @default "Breadcrumb" */
  a11yLabel?: string;
  children: ReactNode;
}

export function Breadcrumb({
  a11yLabel = "Breadcrumb",
  children,
  className,
  ...rest
}: BreadcrumbProps) {
  const items = Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <nav aria-label={a11yLabel} className={className} {...rest}>
      <ol className="flex flex-wrap items-center gap-1.5 text-ui-sm">
        {items.map((child, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {child}
            {index < items.length - 1 ? (
              <span aria-hidden className="select-none text-ink-soft">
                /
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
