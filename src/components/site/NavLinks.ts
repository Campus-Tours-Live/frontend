import { type LucideIcon } from "lucide-react";

/**
 * Primary site nav links. Lives in its own module (imported directly by the
 * client nav components) because the `icon` is a React component and cannot be
 * passed as a prop from a Server Component to a Client Component.
 *
 * Intentionally empty: the header keeps only the global search + account menu.
 * The structure is retained so links can be reintroduced without reshaping the
 * nav components.
 */
export interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_LINKS: NavLink[] = [];
