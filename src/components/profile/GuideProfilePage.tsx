"use client";

import { Alert, Body, Card, InlineLoading, SectionHeading, StatusBadge } from "@/components/ui";
import { useGuideProfile, useMe } from "@/lib/data-access";
import { formatMonthYear } from "@/lib/format";
import { GuideProfileForm } from "./GuideProfileForm";
import { QueryErrorAlert } from "@/components/auth/QueryErrorAlert";
import {
  applicationStatusLabel,
  applicationStatusVariant,
  verificationStatusLabel,
} from "./guideProfileStatus";

export function GuideProfilePage() {
  const { me } = useMe();
  const { data: profile, isLoading, isError, error } = useGuideProfile();

  if (isLoading) {
    return <InlineLoading label="Loading profile…" />;
  }

  if (isError || !profile) {
    return <QueryErrorAlert error={error}>Failed to load your guide profile.</QueryErrorAlert>;
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
            <Body as="dt" size="small" color="muted">
              Display name
            </Body>
            <Body as="dd" size="small" weight={600} color="ink">
              {profile.displayName ?? "—"}
            </Body>
          </div>
          <div>
            <Body as="dt" size="small" color="muted">
              Email
            </Body>
            <Body as="dd" size="small" weight={600} color="ink">
              {profile.email ?? "—"}
            </Body>
          </div>
          <div>
            <Body as="dt" size="small" color="muted">
              Member since
            </Body>
            <Body as="dd" size="small" weight={600} color="ink">
              {formatMonthYear(me?.createdAt)}
            </Body>
          </div>
          <div>
            <Body as="dt" size="small" color="muted">
              Application
            </Body>
            <dd className="mt-1">
              <StatusBadge variant={applicationStatusVariant(profile.applicationStatus)}>
                {applicationStatusLabel(profile.applicationStatus)}
              </StatusBadge>
            </dd>
          </div>
          <div>
            <Body as="dt" size="small" color="muted">
              Verification
            </Body>
            <Body as="dd" size="small" weight={600} color="ink">
              {verificationStatusLabel(profile.verificationStatus)}
            </Body>
          </div>
        </dl>
      </Card>

      <GuideProfileForm profile={profile} />
    </div>
  );
}
