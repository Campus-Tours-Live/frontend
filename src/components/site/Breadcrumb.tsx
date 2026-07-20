import Link from "next/link";

/**
 * Breadcrumb — reusable navigation trail.
 * Pass an ordered list of items; the last item is rendered as the current page
 * (no link). Example:
 *   <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Sign up" }]} />
 */
export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-ui-sm font-semibold">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-ink-soft transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="text-ink">
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden className="text-ink-soft/50">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
