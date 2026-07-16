import { type AnchorHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Link } from "../actions/Link";

/**
 * BreadcrumbItem — one crumb in a {@link Breadcrumb}. A link (client-routed via {@link Link}) unless
 * `isCurrent`, in which case it renders as non-interactive text marked `aria-current="page"` (the
 * current location shouldn't be a link). `href` is required but ignored when `isCurrent`.
 */
export interface BreadcrumbItemProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  /** @default false */
  isCurrent?: boolean;
  children: ReactNode;
}

export function BreadcrumbItem({
  href,
  isCurrent = false,
  className,
  children,
  ...rest
}: BreadcrumbItemProps) {
  if (isCurrent) {
    return (
      <span aria-current="page" className={cn("font-semibold text-ink", className)}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={cn("text-ink-soft hover:text-primary", className)} {...rest}>
      {children}
    </Link>
  );
}
