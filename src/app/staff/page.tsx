/**
 * Staff entry placeholder. The full ADMIN/SUPPORT console is out
 * of scope for now; this page exists so the role guards have a valid destination
 * instead of a 404. Access is gated by the staff layout (staff role required).
 */
import { Container, SectionHeading } from "@/components/ui";

export default function StaffPage() {
  return (
    <Container as="main" className="py-16">
      <SectionHeading
        title="Staff area"
        lead="The admin & support console is coming soon."
        level={1}
      />
    </Container>
  );
}
