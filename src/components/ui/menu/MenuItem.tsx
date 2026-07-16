import { type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "../link/Link";

/**
 * MenuItem — a single icon + label row used in menus, dropdowns and the account
 * side menu. Renders a Link when `href` is set (full-page nav auto-detected for
 * BFF/absolute/hash hrefs) or an inert <button> for not-yet-wired stubs.
 *
 * Variants:
 *  - "row"  (default) — compact card row, used in dropdowns / drawers.
 *  - "pill" — rounded pill row with a bold active state, used in the side menu.
 *
 * Styling maps to the design system; only structure/behaviour live here.
 */
export type MenuItemVariant = "row" | "pill";

const BASE: Record<MenuItemVariant, string> = {
  row: "flex w-full items-center gap-2.5 rounded-card px-3 py-2 text-left text-[14px] transition-colors",
  pill: "flex w-full items-center gap-3 rounded-pill px-3.5 py-2.5 text-left text-[14px] transition-colors",
};

const STATE: Record<MenuItemVariant, { active: string; idle: string }> = {
  row: {
    active: "bg-primary-soft font-semibold text-ink",
    idle: "font-semibold text-ink-soft hover:bg-primary-soft hover:text-ink",
  },
  pill: {
    active: "bg-primary-soft font-bold text-primary",
    idle: "font-semibold text-ink-soft hover:bg-primary-soft hover:text-ink",
  },
};

export interface MenuItemProps {
  children: ReactNode;
  icon?: LucideIcon;
  variant?: MenuItemVariant;
  active?: boolean;
  /** Destination; omit for an inert stub (<button>). */
  href?: string;
  /** Force full-page navigation (<a>); auto for BFF/absolute/hash hrefs. */
  external?: boolean;
  /** Fired on activation — e.g. to close the containing menu. */
  onSelect?: () => void;
  /** e.g. "menuitem" for ARIA menus. */
  role?: string;
  className?: string;
  iconSize?: number;
}

export function MenuItem({
  children,
  icon: Icon,
  variant = "row",
  active = false,
  href,
  external,
  onSelect,
  role,
  className,
  iconSize,
}: MenuItemProps) {
  const classes = cn(
    BASE[variant],
    active ? STATE[variant].active : STATE[variant].idle,
    className,
  );
  const size = iconSize ?? (variant === "pill" ? 17 : 16);
  const inner = (
    <>
      {Icon ? <Icon size={size} strokeWidth={1.8} className="shrink-0" /> : null}
      {children}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        external={external}
        onClick={onSelect}
        role={role}
        aria-current={active ? "page" : undefined}
        className={classes}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onSelect} role={role} className={classes}>
      {inner}
    </button>
  );
}
