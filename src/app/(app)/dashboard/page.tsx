"use client";

import { Alert, InlineLoading } from "@/components/ui";
import { useDashboard } from "@/lib/data-access";
import { ParticipantSummary } from "@/components/dashboard/ParticipantSummary";
import { GuideSummary } from "@/components/dashboard/GuideSummary";
import { QueryErrorAlert } from "@/components/auth/QueryErrorAlert";

/**
 * Shared signed-in dashboard — one route, one BFF aggregate. The BFF reads the
 * current role and returns a role-shaped payload (`kind`); this page just renders by
 * `kind` (the role-branch decision lives in the BFF, not here). Switching role
 * invalidates ["dashboard"], so it re-renders the other area in place — no navigation.
 * AppShell provides the centered grid, so the summaries render bare.
 */
export default function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboard();

  if (isLoading) return <InlineLoading label="Loading…" />;
  if (isError || !data)
    return <QueryErrorAlert error={error}>Failed to load your dashboard</QueryErrorAlert>;

  return data.kind === "guide" ? <GuideSummary data={data} /> : <ParticipantSummary data={data} />;
}
