/** Shared domain types for the data-access layer. */

export type Role = "PARTICIPANT" | "GUIDE" | "ADMIN" | "SUPPORT";

export interface Me {
  id: string;
  roles: Role[];
  activeRole: Role | null;
  participantType: string | null;
  guideStatus: string | null;
  accountStatus: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  ageBand: string | null;
  createdAt: string | null; // ISO-8601 (UTC) account creation; rendered as "Member since <Month Year>"
}

export interface ParticipantProfile {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  participantType?: string;
  gradeLevel?: string;
  intendedMajor?: string;
  topicsOfInterest?: string[];
  universitiesOfInterest?: string[];
  guardianRequired?: boolean;
}

export interface GuideProfile {
  userId?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  accountStatus?: string;
  universityId?: string | null;
  universityName?: string | null;
  universityShortName?: string | null;
  major?: string;
  classYear?: string;
  bio?: string | null;
  languages?: string[];
  specialties?: string[];
  basePriceCents?: number | null;
  currency?: string;
  applicationStatus?: string | null;
  verificationStatus?: string | null;
}

/** Lifecycle status of a guide's tour offering (Core TourOfferingStatus). */
export type OfferingStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

/** A guide's sellable tour offering (Core TourOfferingResponse). */
export interface Offering {
  id: string;
  title: string;
  slug: string;
  status: OfferingStatus;
  topic: string | null;
  universityId: string | null;
  durationMin: number;
  priceCents: number;
  currency: string;
  description?: string | null;
}

/** Body for POST /v1/guide/offerings — creates a DRAFT offering. */
export interface CreateOfferingInput {
  title: string;
  universityId: string;
  topic: string;
  durationMin: number;
  priceCents: number;
  description?: string;
  languages?: string[];
}

/** GET /v1/dashboard — the role-shaped home aggregate (discriminated by `kind`). */
export interface GuideDashboard {
  kind: "guide";
  guide: GuideProfile;
  guideStatus: string | null;
  canPublish: boolean;
  offerings: Offering[];
  createdAt: string | null; // account "member since" (ISO-8601, from MeResponse.createdAt)
}
export interface ParticipantDashboard {
  kind: "participant";
  participant: ParticipantProfile;
  createdAt: string | null; // account "member since" (ISO-8601, from MeResponse.createdAt)
}
export type Dashboard = GuideDashboard | ParticipantDashboard;

/** GET /v1/onboarding?role= — derived onboarding progress. */
export interface OnboardingStep {
  key: string;
  label: string;
  done: boolean;
}
export interface OnboardingProgress {
  role: "guide" | "participant";
  started: boolean;
  complete: boolean;
  canSubmit: boolean;
  applicationStatus: string | null;
  verificationStatus: string | null;
  steps: OnboardingStep[];
}

export interface ParticipantProfileUpdate {
  firstName?: string;
  lastName?: string;
  participantType?: string;
  universitiesOfInterest?: string[];
  topicsOfInterest?: string[];
}

export interface GuideProfileUpdate {
  firstName?: string;
  lastName?: string;
  universityId?: string;
  major?: string;
  classYear?: string;
  bio?: string;
  languages?: string[];
  specialties?: string[];
  basePriceCents?: number;
  verificationEmail?: string;
  submit?: boolean;
}

export interface University {
  id: string;
  name: string;
  shortName?: string | null;
  city?: string | null;
  region?: string | null;
}

export interface TourTopic {
  value: string;
  label: string;
}

export type AvailabilityExceptionType = "UNAVAILABLE_ALL_DAY" | "UNAVAILABLE_RANGE" | "ADDITIONAL";

/** Recurring weekly availability block (Core AvailabilityRuleResponse). */
export interface AvailabilityRule {
  id: string;
  dayOfWeek: number;
  startLocal: string;
  endLocal: string;
  timezone: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
  createdAt: string | null;
}

/** One-off override to weekly availability (Core AvailabilityExceptionResponse). */
export interface AvailabilityException {
  id: string;
  exceptionDate: string;
  type: AvailabilityExceptionType;
  startLocal: string | null;
  endLocal: string | null;
  reason: string | null;
  createdAt: string | null;
}

/** Per-guide booking policy (Core BookingSettingsResponse). */
export interface BookingSettings {
  acceptanceMode: "AUTO" | "MANUAL";
  responseDeadlineMin: number;
  minNoticeMin: number;
  maxAdvanceDays: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  durationsOffered: number[];
  timezone: string;
}

/** GET /v1/guide/availability */
export interface AvailabilitySummary {
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  bookingSettings: BookingSettings;
}

export interface CreateAvailabilityRuleInput {
  dayOfWeek: number;
  startLocal: string;
  endLocal: string;
  timezone?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  active?: boolean;
}

export interface UpdateAvailabilityRuleInput {
  dayOfWeek?: number;
  startLocal?: string;
  endLocal?: string;
  timezone?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  active?: boolean;
}

export interface CreateAvailabilityExceptionInput {
  exceptionDate: string;
  type: AvailabilityExceptionType;
  startLocal?: string;
  endLocal?: string;
  reason?: string;
}

export interface UpdateAvailabilityExceptionInput {
  exceptionDate?: string;
  type?: AvailabilityExceptionType;
  startLocal?: string;
  endLocal?: string;
  reason?: string | null;
}

export interface UpdateBookingSettingsInput {
  acceptanceMode?: "AUTO" | "MANUAL";
  responseDeadlineMin?: number;
  minNoticeMin?: number;
  maxAdvanceDays?: number;
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
  durationsOffered?: number[];
  timezone?: string;
}
