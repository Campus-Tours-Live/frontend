import { Breadcrumb as UIBreadcrumb, BreadcrumbItem } from "@/components/ui";

/**
 * Breadcrumb — thin `items`-based adapter over the shared UI Breadcrumb. Pass an
 * ordered list; the last item renders as the current page (non-link). Example:
 *   <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Sign up" }]} />
 */
export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <UIBreadcrumb>
      {items.map((item, i) => (
        <BreadcrumbItem key={item.label} href={item.href ?? "#"} isCurrent={i === items.length - 1}>
          {item.label}
        </BreadcrumbItem>
      ))}
    </UIBreadcrumb>
  );
}
