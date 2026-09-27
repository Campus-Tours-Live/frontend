"use client";

import { BadgeCheck, GraduationCap } from "lucide-react";
import {
  Body,
  Button,
  Card,
  Heading,
  InlineLoading,
  Link,
  PageContainer,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { QueryErrorAlert } from "@/components/auth/QueryErrorAlert";
import {
  guideStatusLabel,
  guideStatusVariant,
  verificationStatusLabel,
} from "@/components/profile/guideProfileStatus";
import { useGuideProfile } from "@/lib/data-access";

const APPLICATION_GUIDANCE: Record<string, string> = {
  VERIFIED:
    "Your guide account is verified. Set your availability and create offerings for your verified universities.",
  PENDING:
    "Your guide verification is pending. You can review your profile details while waiting for your status to update.",
  REJECTED:
    "Your guide verification was not approved. Review your profile details for accuracy. A rejection reason is not available on this page.",
};

const UNIVERSITY_GUIDANCE: Record<string, string> = {
  VERIFIED: "Your affiliation with this university is verified.",
  PENDING: "Verification for this university is pending.",
  REJECTED:
    "This university affiliation was not approved. Review your university details in your profile.",
  NOT_SUBMITTED:
    "Verification has not been submitted for this university. Review your university details in your profile.",
};

export function GuideVerificationPage() {
  const { data: profile, isLoading, isError, error, isFetching, refetch } = useGuideProfile();
  const status = profile?.guideStatus;
  const applicationGuidance = APPLICATION_GUIDANCE[status ?? ""];

  return (
    <PageContainer>
      <PageHeader
        title="Verification"
        lead="Check your guide application and university verification statuses."
        action={
          <Button variant="secondary" disabled={isFetching} onClick={() => void refetch()}>
            {isFetching ? "Refreshing…" : "Refresh status"}
          </Button>
        }
      />

      {isLoading ? (
        <InlineLoading label="Loading verification status…" />
      ) : isError || !profile ? (
        <QueryErrorAlert error={error}>
          Could not load your verification status. Try refreshing your status.
        </QueryErrorAlert>
      ) : (
        <>
          <Card as="section" aria-labelledby="application-status-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Heading
                as="h2"
                size="large"
                id="application-status-heading"
                className="flex items-center gap-2"
              >
                <BadgeCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                Guide application
              </Heading>
              <StatusBadge variant={guideStatusVariant(status)}>
                {applicationGuidance ? guideStatusLabel(status) : "Status unavailable"}
              </StatusBadge>
            </div>
            <Body color="muted">
              {applicationGuidance ??
                "Your application status is not available yet. Review your profile details and check again later."}
            </Body>
            <div className="flex flex-wrap gap-3">
              <Link href="/profile" variant="secondary">
                Review profile
              </Link>
              {status === "VERIFIED" ? (
                <>
                  <Link href="/guide/availability" variant="secondary">
                    Set availability
                  </Link>
                  <Link href="/guide/tour-offerings" variant="primary">
                    Manage offerings
                  </Link>
                </>
              ) : null}
            </div>
          </Card>

          <section aria-labelledby="university-verification-heading" className="space-y-4">
            <Heading as="h2" size="large" id="university-verification-heading">
              University verification
            </Heading>
            <Body color="muted">
              Each university has its own verification status. Your guide account and the university
              associated with an offering must be verified before you can publish it.
            </Body>
            {profile.universities?.length ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {profile.universities.map((university, index) => {
                  const guidance = UNIVERSITY_GUIDANCE[university.verificationStatus];
                  return (
                    <li key={university.universityId ?? index} className="min-w-0">
                      <Card className="h-full space-y-3">
                        <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
                        <Heading as="h3" size="medium" className="break-words">
                          {university.universityName ||
                            university.universityShortName ||
                            "University name unavailable"}
                        </Heading>
                        <StatusBadge variant={guideStatusVariant(university.verificationStatus)}>
                          {guidance
                            ? verificationStatusLabel(university.verificationStatus)
                            : "Status unavailable"}
                        </StatusBadge>
                        <Body size="small" color="muted">
                          {guidance ??
                            "Verification status is not available for this university yet. Check again later."}
                        </Body>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Card>
                <Body weight={600}>No universities listed</Body>
                <Body color="muted" className="mt-2">
                  Review your profile to check your university details.
                </Body>
                <Link href="/profile" variant="secondary" className="mt-4">
                  Review university details
                </Link>
              </Card>
            )}
          </section>
        </>
      )}
    </PageContainer>
  );
}
