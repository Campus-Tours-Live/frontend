import { Container } from "@/components/ui";
import { SiteHeader } from "./SiteHeader";
import { AccountSidebar } from "./AccountSidebar";

/** Shared signed-in application layout with header, sidebar, and page content. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main>
      
      <SiteHeader showGetStarted={false} showDashboardLink={false} />

      
      <Container className="pb-24 pt-10 lg:grid lg:grid-cols-[256px_1fr]">
        <AccountSidebar />
        <section className="min-w-0 lg:border-l lg:border-border lg:pl-10">{children}</section>
      </Container>
    </main>
  );
}
