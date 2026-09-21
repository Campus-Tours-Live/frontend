import { SectionHeading } from "@/components/ui";

/**
 * Payment methods (placeholder). Chrome (header + side menu) comes from the (app)
 * route-group layout via AppShell; this just identifies the page for now.
 */
export default function PaymentMethodsPage() {
  return (
    <SectionHeading
      eyebrow="Account"
      title="Payment methods"
      lead="This page is coming soon."
      level={1}
    />
  );
}
