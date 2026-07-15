import { AccountNav } from "./AccountNav";

/**
 * Desktop left rail (lg+). On small/medium screens the same menu lives in the
 * hamburger drawer (see MobileNav). Rendered by AppShell for logged-in users.
 */
export function AccountSidebar() {
  return (
    <aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start lg:pr-10">
      <AccountNav />
    </aside>
  );
}
