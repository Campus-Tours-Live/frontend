"use client";

import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { useMe } from "@/lib/data-access";
import { submitLogout } from "@/lib/auth/logout";
import { Caption, Drawer, IconButton, Link, MenuItem, MenuSection } from "@/components/ui";
import { AccountNav } from "./AccountNav";
import { NAV_LINKS } from "./NavLinks";

/** Mobile navigation drawer with account and authentication actions. */
export function MobileNav({
  showAuthActions = true,
}: {
  showAuthActions?: boolean;
  
  showGetStarted?: boolean;
  
  showDashboard?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { isLoading, isOnboarded, sessionUnverified } = useMe();

  const loggedIn = isOnboarded;

  return (
    <div className="lg:hidden">
      
      <IconButton
        a11yLabel="Open menu"
        variant="ghost"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="-ml-[9px] h-10 w-10"
      >
        <Menu size={22} strokeWidth={2} aria-hidden />
      </IconButton>

      
      <Drawer open={open} onClose={close} side="left" ariaLabel="Menu">
        
        <IconButton
          a11yLabel="Close menu"
          variant="ghost"
          onClick={close}
          className="absolute right-2 top-2 z-10"
        >
          <X size={20} strokeWidth={2} aria-hidden />
        </IconButton>

        <div className="flex-1 overflow-y-auto px-3 pb-6 pt-12">
          
          {showAuthActions && !isLoading && !sessionUnverified && !loggedIn && (
            <div className="mb-4 rounded-panel bg-primary-soft p-4">
              <Link href="/signin" variant="primary" block onClick={close}>
                Sign in or Join Now
              </Link>
              <Caption as="p" className="mt-2.5 text-center leading-snug">
                Book live campus tours, or guide your own campus.
              </Caption>
            </div>
          )}

          
          {loggedIn && <AccountNav onNavigate={close} />}

          
          {NAV_LINKS.length > 0 && (
            <MenuSection label="Discover" bordered>
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <MenuItem href={link.href} icon={link.icon} iconSize={17} onSelect={close}>
                    {link.label}
                  </MenuItem>
                </li>
              ))}
            </MenuSection>
          )}

          
          {showAuthActions && loggedIn && (
            <MenuSection bordered>
              <li>
                <MenuItem
                  icon={LogOut}
                  iconSize={17}
                  onSelect={() => {
                    close();
                    submitLogout();
                  }}
                >
                  Sign out
                </MenuItem>
              </li>
            </MenuSection>
          )}
        </div>
      </Drawer>
    </div>
  );
}
