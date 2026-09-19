"use client";

import {
  ChevronDown,
  LayoutDashboard,
  User,
  CircleHelp,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Divider, Link, List, MenuItem } from "@/components/ui";
import { useDropdown } from "@/hooks";
import { useMe } from "@/lib/data-access";
import { submitLogout } from "@/lib/auth/logout";
import { NAV_LINKS } from "./NavLinks";

interface Shortcut {
  label: string;
  icon: LucideIcon;
  href: string;
}

const COMMON_MENU: Shortcut[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Profile", icon: User, href: "/profile" },
  { label: "Support", icon: CircleHelp, href: "/support" },
];

const PANEL =
  "absolute right-6 top-full z-50 w-56 rounded-card border border-border bg-card p-1.5 shadow-card transition-opacity duration-150";

function loginThen(href: string): string {
  return `/auth/login?intent=signin&returnTo=${encodeURIComponent(href)}`;
}

/** Desktop header navigation and account dropdown. */
export function HeaderNav({
  showDashboard = true,
  showAuthActions = true,
}: 
                <div className="p-2.5">
                  <Link href="/signin" variant="primary" block onClick={dd.close}>
                    Sign in or Join Now
                  </Link>
                </div>

                <Divider className="mx-1 mb-1" />

                
                {COMMON_MENU.map((it) => (
                  <MenuItem key={it.label} role="menuitem" icon={it.icon} href={loginThen(it.href)}>
                    {it.label}
                  </MenuItem>
                ))}
              </>
            )}
          </div>
        </div>
      ) : null}
    </List>
  );
}
