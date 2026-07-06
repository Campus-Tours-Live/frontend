"use client";

import { Alert } from "@/components/ui";
import { useDashboard } from "@/lib/data-access";
import { ParticipantSummary } from "@/components/dashboard/ParticipantSummary";
import { GuideSummary } from "@/components/dashboard/GuideSummary";

/**
 * Shared signed-in dashboard — one route, one BFF aggregate. The BFF reads the
 * active role and returns a role-shaped payload (`kind`); this page just renders by
 * `kind` (the role-branch decision lives in the BFF, not here). Switching role
 * invalidates ["dashboard"], so it re-renders the other area in place — no navigation.
 * AppShell provides the centered grid, so the summaries render bare.
 */
export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) return <p className="text-ink-soft">Loading…</p>;
  if (isError || !data) return <Alert variant="error">Failed to load your dashboard</Alert>;

  return data.kind === "guide" ? <GuideSummary data={data} /> : <ParticipantSummary data={data} />;
}
