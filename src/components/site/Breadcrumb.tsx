import { Breadcrumb as UIBreadcrumb, BreadcrumbItem } from "@/components/ui";

/** Small adapter for rendering an ordered breadcrumb trail. */
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
