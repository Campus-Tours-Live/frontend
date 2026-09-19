import { AccountNav } from "./AccountNav";

/** Desktop wrapper for the shared account navigation. */
export function AccountSidebar() {
  return (
    <aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start lg:pr-10">
      <AccountNav />
    </aside>
  );
}
