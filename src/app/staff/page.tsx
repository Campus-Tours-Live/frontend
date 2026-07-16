/**
 * Staff entry placeholder. The full ADMIN/SUPPORT console is out
 * of scope for now; this page exists so the role guards have a valid destination
 * instead of a 404. Access is gated by the staff layout (staff role required).
 */
import { Heading } from "@/components/ui";

export default function StaffPage() {
  return (
    <main className="mx-auto max-w-content px-6 py-16">
      <Heading as="h1" size="xlarge">
        Staff area
      </Heading>
      <p className="mt-2 text-ink-soft">The admin &amp; support console is coming soon.</p>
    </main>
  );
}
