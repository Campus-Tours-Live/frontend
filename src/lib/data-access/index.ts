/**
 * Data-access public API — hooks, types, and {@link ApiError}. The query/mutation
 * definitions and other http/keys utilities are internal; the QueryProvider is
 * imported directly (src/lib/data-access/QueryProvider) by the root layout to
 * keep the barrel out of the server graph.
 */
export { ApiError } from "./http";
export { canonicalizeTopicIds } from "./topics";
export { useMe } from "./hooks/use-me";
export { useParticipantProfile } from "./hooks/use-participant-profile";
export { useGuideProfile } from "./hooks/use-guide-profile";
export { useTourTopics } from "./hooks/use-tour-topics";
export { useTourFeatures } from "./hooks/use-tour-features";
export { useTourCatalog } from "./hooks/use-tour-catalog";
export { useTourDetail } from "./hooks/use-tour-detail";
export { useUniversitySearch } from "./hooks/use-university-search";
export { useMajors } from "./hooks/use-majors";
export { useDegrees } from "./hooks/use-degrees";
export { useUpdateParticipantProfile } from "./hooks/use-update-participant-profile";
export { useUpdateGuideProfile } from "./hooks/use-update-guide-profile";
export { useSetCurrentRole } from "./hooks/use-set-current-role";
export { useSetOnboardingRole } from "./hooks/use-set-onboarding-role";
export { useDashboard } from "./hooks/use-dashboard";
export { useOfferings } from "./hooks/use-offerings";
export { useCreateOffering } from "./hooks/use-create-offering";
export { useActivateOffering } from "./hooks/use-activate-offering";
export {
  useAvailabilityExceptions,
  useAvailabilityRules,
  useAvailabilitySettings,
  useOfferingSlots,
  useOverrideMultiPreview,
  useReplaceOverrides,
  useReplaceRules,
  useResolvedAvailability,
  useUpdateAvailabilityRule,
  useUpdateAvailabilitySettings,
} from "./hooks/use-guide-availability";

export type {
  Me,
  MeUser,
  Role,
  ParticipantProfile,
  GuideProfile,
  GuideUniversity,
  ParticipantProfileUpdate,
  GuideProfileUpdate,
  University,
  TourTopic,
  MetaOption,
  TourFeatureOptionsByTopic,
  TourSummary,
  TourDetail,
  TourCatalogFilters,
  TourCatalogSort,
  Offering,
  OfferingStatus,
  CreateOfferingInput,
  Dashboard,
  GuideDashboard,
  ParticipantDashboard,
  AvailabilityRule,
  AvailabilityException,
  AvailabilityExceptionKind,
  AvailabilitySettings,
  AvailabilityOccurrence,
  ResolvedAvailability,
  AffectedBooking,
  AvailabilityWriteEnvelope,
  CreateAvailabilityRuleInput,
  UpdateAvailabilityRuleInput,
  UpdateAvailabilitySettingsInput,
  OfferingSlot,
  OverridePreviewDay,
  OverridePreviewResponse,
  OverrideWindow,
  OverrideMultiPreviewParams,
  OverrideReplaceInput,
  RulesReplaceInput,
} from "./types";
