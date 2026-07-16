"use client";

import { Alert, Card, SectionHeading, Spinner, StatusBadge } from "@/components/ui";
import { useGuideProfile, useMe } from "@/lib/data-access";
import { formatMonthYear } from "@/lib/format";
import { GuideProfileForm } from "./GuideProfileForm";
import {
  applicationStatusLabel,
  applicationStatusVariant,
  verificationStatusLabel,
} from "./guideProfileStatus";

export function GuideProfilePage() {
  const { me } = useMe();
  const { data: profile, isLoading, isError } = useGuideProfile();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-ink-soft">
        <Spinner />
        Loading profile…
      </div>
    );
  }

  if (isError || !profile) {
    return <Alert variant="error">Failed to load your guide profile.</Alert>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <SectionHeading
        eyebrow="Guide"
        title="Profile"
        lead="Update the details students see and that admins review."
        level={1}
      />

      <Card padded={false} className="rounded-panel p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[13px] text-ink-soft">Display name</dt>
            <dd className="font-semibold text-ink">{profile.displayName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-soft">Email</dt>
            <dd className="font-semibold text-ink">{profile.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-soft">Member since</dt>
            <dd className="font-semibold text-ink">{formatMonthYear(me?.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-soft">Application</dt>
            <dd className="mt-1">
              <StatusBadge variant={applicationStatusVariant(profile.applicationStatus)}>
                {applicationStatusLabel(profile.applicationStatus)}
              </StatusBadge>
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-soft">Verification</dt>
            <dd className="font-semibold text-ink">
              {verificationStatusLabel(profile.verificationStatus)}
            </dd>
          </div>
        </dl>
      </Card>

      <GuideProfileForm profile={profile} />
    </div>
  );
}
