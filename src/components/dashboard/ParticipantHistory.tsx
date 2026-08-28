import { SectionHeading, Link } from "@/components/ui";

/** Participant dashboard history panel — static CTA directing the user to their past tours. */
export function ParticipantHistory() {
  return (
    <div className="card px-5 py-5 sm:px-6">
      <SectionHeading
        eyebrow="History"
        title="Your past tours"
        lead="Review completed tours, recordings when available, and booking history."
      />
      <div className="mt-6">
        <Link href="/tour-history" variant="secondary">
          My Tours
        </Link>
      </div>
    </div>
  );
}
