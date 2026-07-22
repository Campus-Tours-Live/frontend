"use client";

import { Alert, InlineLoading, SectionHeading } from "@/components/ui";
import { useMe } from "@/lib/data-access";
import { GuideProfilePage } from "@/components/profile/GuideProfilePage";

/**
 * Shared profile route — branches on activeRole like the dashboard. Guide hat
 * loads the editable guide profile; participant hat stays a placeholder for now.
 */
export default function ProfilePage() {
  const { me, isLoading, sessionUnverified } = useMe();

  if (isLoading) return <InlineLoading label="Loading…" />;
  // We could not check who you are (the BFF could not reach Google), and we have nothing cached.
  // Explain it instead of spinning forever — the spinner would never resolve, since there
  // is no polling loop and nothing to wait for.
  if (sessionUnverified) {
    return (
      <Alert variant="warning">
        We couldn&apos;t load your profile because your session couldn&apos;t be verified just now.
        You&apos;re still signed in — please try again shortly.
      </Alert>
    );
  }
  if (me?.activeRole === "GUIDE") return <GuideProfilePage />;

  return (
    <SectionHeading eyebrow="Account" title="Profile" lead="This page is coming soon." level={1} />
  );
}
