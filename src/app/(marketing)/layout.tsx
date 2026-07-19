import { SiteHeader } from "@/components/site/SiteHeader";

/**
 * Marketing layout — the public, pre-auth surface (home, tours). Renders the full
 * collapsing SiteHeader (with the tours search) once for the whole group, so the
 * pages themselves are just content. Auth/onboarding live in the sibling (auth)
 * group, which has no header.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
    </>
  );
}
