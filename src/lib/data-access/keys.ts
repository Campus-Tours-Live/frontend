/**
 * Central React Query key factory. Every key lives here (no scattered constants),
 * so reads and the mutations that invalidate them can't drift.
 */
export const queryKeys = {
  me: () => ["me"] as const,
  participantProfile: () => ["participant-profile"] as const,
  guideProfile: () => ["guide-profile"] as const,
  tourTopics: () => ["tour-topics"] as const,
  universitySearch: (q: string) => ["university-search", q] as const,
  dashboard: () => ["dashboard"] as const,
  guideOfferings: () => ["guide-offerings"] as const,
  onboarding: (role: string) => ["onboarding", role] as const,
  // Availability v2 (CTL-55) — BFF Contract A (/v1/availability*, /v1/offerings/:id/slots).
  availabilityRules: () => ["availability-rules"] as const,
  availabilityExceptions: () => ["availability-exceptions"] as const,
  availabilitySettings: () => ["availability-settings"] as const,
  availabilityResolved: () => ["availability-resolved"] as const,
  offeringSlots: (offeringId: string) => ["offering-slots", offeringId] as const,
};
