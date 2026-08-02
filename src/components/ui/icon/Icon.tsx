import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  Info,
  LogOut,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  User,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Icon — thin wrapper over a lucide icon that applies the app's defaults (stroke width, shrink-0,
 * aria-hidden) so ad-hoc icon usage stays consistent. Reference a glyph two ways:
 *
 *   <Icon icon={LogOut} />              // pass the lucide component directly
 *   <Icon name="logout" />             // …or by curated registry name (see ICONS below)
 *   <Icon name="chevronDown" size={14} />
 *
 * Prefer `name` for common icons so the set stays curated in one place; `icon` stays available for
 * one-offs. Colour is inherited (`currentColor`) — set it via `className`/a parent. Decorative by
 * default (`aria-hidden`); pass `title` for a standalone meaningful icon.
 */
const ICONS = {
  check: Check,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  clock: Clock,
  close: X,
  edit: Pencil,
  info: Info,
  logout: LogOut,
  menu: Menu,
  more: MoreHorizontal,
  plus: Plus,
  search: Search,
  trash: Trash2,
  user: User,
  userPlus: UserPlus,
  alert: TriangleAlert,
  error: CircleAlert,
  success: CircleCheck,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface IconBaseProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Accessible name for a standalone (non-decorative) icon. Omit when the icon is decorative. */
  title?: string;
}

export type IconProps = IconBaseProps &
  ({ icon: LucideIcon; name?: never } | { name: IconName; icon?: never });

export function Icon({ size = 16, strokeWidth = 1.8, className, title, ...source }: IconProps) {
  const LucideGlyph = "icon" in source && source.icon ? source.icon : ICONS[source.name!];
  return (
    <LucideGlyph
      size={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
