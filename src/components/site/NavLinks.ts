import { Compass, Lightbulb, GraduationCap, type LucideIcon } from "lucide-react";

/**
 * Primary site nav links. Lives in its own module (imported directly by the
 * client nav components) because the `icon` is a React component and cannot be
 * passed as a prop from a Server Component to a Client Component.
 */
export interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Explore tours", href: "/tours", icon: Compass },
  { label: "How it works", href: "#", icon: Lightbulb },
  { label: "For students & parents", href: "#", icon: GraduationCap },
];
