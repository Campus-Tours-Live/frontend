"use client";

import { SectionHeading } from "@/components/ui";
import { useMe } from "@/lib/data-access";
import { GuideProfilePage } from "@/components/profile/GuideProfilePage";

/**
 * Shared profile route — branches on activeRole like the dashboard. Guide hat
 * loads the editable guide profile; participant hat stays a placeholder for now.
 */
export default function ProfilePage() {
  const { me } = useMe();

  if (me?.activeRole === "GUIDE") return <GuideProfilePage />;

  return (
    <SectionHeading eyebrow="Account" title="Profile" lead="This page is coming soon." level={1} />
  );
}
