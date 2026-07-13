import type { TourCatalogFilters } from "./types";

/**
 * Central React Query key factory. Every key lives here (no scattered constants),
 * so reads and the mutations that invalidate them can't drift.
 */
export const queryKeys = {
  me: () => ["me"] as const,
  participantProfile: () => ["participant-profile"] as const,
  guideProfile: () => ["guide-profile"] as const,
  tourTopics: () => ["tour-topics"] as const,
  tourCatalog: (filters: TourCatalogFilters) => ["tour-catalog", filters] as const,
  tourDetail: (id: string) => ["tour-detail", id] as const,
  universitySearch: (q: string) => ["university-search", q] as const,
  dashboard: () => ["dashboard"] as const,
  guideOfferings: () => ["guide-offerings"] as const,
  onboarding: (role: string) => ["onboarding", role] as const,
};
