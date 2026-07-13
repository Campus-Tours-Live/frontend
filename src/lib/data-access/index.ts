/**
 * Data-access public API — hooks, types, and {@link ApiError}. The query/mutation
 * definitions and other http/keys utilities are internal; the QueryProvider is
 * imported directly (src/lib/data-access/QueryProvider) by the root layout to
 * keep the barrel out of the server graph.
 */
export { ApiError } from "./http";
export { useMe } from "./hooks/use-me";
export { useParticipantProfile } from "./hooks/use-participant-profile";
export { useGuideProfile } from "./hooks/use-guide-profile";
export { useTourTopics } from "./hooks/use-tour-topics";
export { useUniversitySearch } from "./hooks/use-university-search";
export { useUpdateParticipantProfile } from "./hooks/use-update-participant-profile";
export { useUpdateGuideProfile } from "./hooks/use-update-guide-profile";
export { useSetActiveRole } from "./hooks/use-set-active-role";
export { useDashboard } from "./hooks/use-dashboard";
export { useOnboarding } from "./hooks/use-onboarding";
export { useOfferings } from "./hooks/use-offerings";
export { useCreateOffering } from "./hooks/use-create-offering";
export { useActivateOffering } from "./hooks/use-activate-offering";
export {
  useAvailabilityExceptions,
  useAvailabilityRules,
  useAvailabilitySettings,
  useCreateAvailabilityException,
  useCreateAvailabilityRule,
  useDeleteAvailabilityException,
  useDeleteAvailabilityRule,
  useOfferingSlots,
  useOverrideMultiPreview,
  useOverridePreview,
  useReplaceOverrides,
  useReplaceRules,
  useResolvedAvailability,
  useUpdateAvailabilityException,
  useUpdateAvailabilityRule,
  useUpdateAvailabilitySettings,
} from "./hooks/use-guide-availability";

export type {
  Me,
  Role,
  ParticipantProfile,
  GuideProfile,
  ParticipantProfileUpdate,
  GuideProfileUpdate,
  University,
  TourTopic,
  Offering,
  OfferingStatus,
  CreateOfferingInput,
  Dashboard,
  GuideDashboard,
  ParticipantDashboard,
  OnboardingProgress,
  OnboardingStep,
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
  CreateAvailabilityExceptionInput,
  UpdateAvailabilityExceptionInput,
  UpdateAvailabilitySettingsInput,
  OfferingSlot,
  OverridePreviewDay,
  OverridePreviewParams,
  OverridePreviewResponse,
  OverrideWindow,
  OverrideMultiPreviewParams,
  OverrideReplaceInput,
  RulesReplaceInput,
} from "./types";
