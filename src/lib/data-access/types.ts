/** Shared domain types for the data-access layer. */

export type Role = "PARTICIPANT" | "GUIDE" | "ADMIN" | "SUPPORT";

/**
 * The identity fields nested under `Me.user`. `PendingUser` and `ProvisionedUser` are
 * deliberately NOT the same shape padded with optionality: a pending principal (no Core account
 * yet) genuinely has no `accountStatus`/`ageBand`/`createdAt` on the wire — those keys are absent
 * entirely, not present-and-null (bff `PendingUserInfo`,
 * ../bff/src/api/userinfo/pendingIdentity.ts). Only `id`/`firstName`/`lastName`/`displayName`/
 * `email` are common to both.
 */
export interface PendingUser {
  /** No Core account exists yet. */
  id: null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  /** The bff guarantees a verified email for every PENDING principal — it 5xxs rather than
   *  emit one without it (`IDENTITY_CLAIMS_INVALID`). */
  email: string;
}

export interface ProvisionedUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  accountStatus: string | null;
  ageBand: string | null;
  createdAt: string | null; // ISO-8601 (UTC) account creation; rendered as "Member since <Month Year>"
}

/** Union of both principal-identity shapes — for code that only touches fields common to
 *  both (e.g. name prefill), not the state-specific `id`/`accountStatus`/`ageBand`. */
export type MeUser = PendingUser | ProvisionedUser;

/**
 * Discriminated `Me` (CTL-97 defer-provisioning). A signed-in principal may exist in Core
 * without having chosen a role yet ("PENDING") — gate every consumer on `provisioningStatus`,
 * never infer pending-ness from `user.id === null` or `roles.length` directly.
 */
export interface PendingMe {
  provisioningStatus: "PENDING";
  user: PendingUser;
  roles: readonly [];
  currentRole: null;
}

export interface ProvisionedMe {
  provisioningStatus: "PROVISIONED";
  user: ProvisionedUser;
  /** Always holds ≥1 role — a bff invariant enforced at parse time by `meSchema`. */
  roles: readonly [Role, ...Role[]];
  currentRole: Role | null;
}

export type Me = PendingMe | ProvisionedMe;

export interface ParticipantProfile {
  type?: string;
  gradeLevel?: string;
  intendedMajor?: string;
  topicsOfInterest?: string[];
  universitiesOfInterest?: string[];
  guardianRequired?: boolean;
  participantStatus?: string;
}

/** A guide's affiliation with one university (Profile Contract v2's per-university shape).
 *  The offering-create flow selects among ALL entries (gated on `verificationStatus`); profile
 *  editing (`GuideProfileForm`) still reads/writes `universities[0]` — multi-university profile
 *  editing is a future enhancement. */
export interface GuideUniversity {
  universityId: string;
  universityName: string | null;
  universityShortName: string | null;
  major?: string;
  degree?: string;
  classYear?: string;
  /** Year the guide entered this university. Core's column is NOT NULL and the read-model field
   *  is REQUIRED — always present on the wire. */
  entryYear: number;
  verificationStatus: string;
}

export interface GuideProfile {
  universities?: GuideUniversity[];
  bio?: string | null;
  spokenLanguages?: string[];
  tourTopics?: string[];
  guideStatus?: string | null;
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
  languages?: string[];
  features?: string[];
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
  /** Feature codes from GET /v1/meta/tour-features for the chosen topic (max 3). */
  features?: string[];
}

/**
 * Server-sent validation rules for the two year fields (CTL-97). The numbers deliberately do NOT
 * live in this repo: they were duplicated in Java and TypeScript and drifted by hand. `entryYear`
 * is computed from the SERVER's UTC clock, so the browser never reads its own.
 */
export interface EnrollmentYearRules {
  entryYear: { min: number; max: number };
  /** Ordered — apply first-hit. Never sort or re-key this array. */
  maxYearsToGraduate: readonly { matches: readonly string[]; years: number }[];
  defaultMaxYearsToGraduate: number;
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
  degree?: string;
  /** Year the guide entered the university (onboarding education step). */
  entryYear?: number;
  bio?: string;
  spokenLanguages?: string[];
  tourTopics?: string[];
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

/** A { value, label } option for a controlled vocabulary (Core MetaController.Option). */
export interface MetaOption {
  value: string;
  label: string;
}

/** Tour feature options grouped by TourTopic name (GET /v1/meta/tour-features). */
export type TourFeatureOptionsByTopic = Record<string, MetaOption[]>;

/** Public marketplace card (Core TourSummaryResponse). */
export interface TourSummary {
  id: string;
  title: string;
  slug: string;
  topic: string;
  universityId: string;
  universityName: string;
  /** Campus photo URL (Cloudflare R2), or null when the university has no photo yet — the card
   *  falls back to {@link CAMPUS_FALLBACK_IMAGE} client-side. */
  universityImageUrl?: string | null;
  guideId: string;
  guideDisplayName: string;
  /** Guide's field of study (major). */
  guideMajor: string;
  /** Guide's degree level (e.g. "BS" | "MS" | "PhD"), or null if unknown. */
  guideDegree: string | null;
  /** Year the guide entered the university, or null if unknown. */
  guideEntryYear: number | null;
  durationMin: number;
  priceCents: number;
  currency: string;
  avgRating: number;
  reviewCount: number;
  /** Languages the tour can be given in (full list; the card shows the first). */
  languages: string[];
  /** Feature codes the guide attached (≤3), from the TourFeature catalog. */
  features: string[];
  /** True if created within the last 30 days (backend-computed) — drives the "New" chip. */
  isNew: boolean;
}

/** Full public tour detail (Core TourDetailResponse). */
export interface TourDetail extends TourSummary {
  description: string | null;
  languages: string[];
  universitySlug: string;
  universityCity: string | null;
  universityRegion: string | null;
  guideBio: string | null;
}

export type TourCatalogSort = "RECOMMENDED" | "PRICE_ASC" | "PRICE_DESC" | "RATING";

/** Query params for GET /v1/tours. */
export interface TourCatalogFilters {
  universityId?: string;
  /** Already-canonical topic ids (see `canonicalizeTopicIds`) — never re-derived here. */
  topicIds?: string[];
  q?: string;
  sort?: TourCatalogSort;
  /** Zero-based page index. @default 0 */
  page?: number;
  /** Page size (max rows per page). @default 20 */
  limit?: number;
}

/** One page of GET /v1/tours results (Core `PagedResponse<TourSummary>`). */
export interface TourCatalogPage {
  items: TourSummary[];
  /** Zero-based index of this page. */
  page: number;
  /** Page size. */
  size: number;
  /** Total matching tours across all pages. */
  totalElements: number;
  /** Total number of pages (0 when there are no results). */
  totalPages: number;
}

// --- Availability v2 (CTL-55) — start + duration, BFF Contract A (/v1/availability*) --------------
// Supersedes the old (day_of_week, start_local, end_local, tz) shape: no `endLocal`, no 24:00
// sentinel, no wraparound. A rule/exception carries `windowMin` (minutes) instead of an end time.

export type AvailabilityExceptionKind = "UNAVAILABLE" | "ADDITIONAL";

/** Recurring weekly availability block (BFF AvailabilityRuleResponse — start + duration). */
export interface AvailabilityRule {
  id: string;
  dayOfWeek: number; // 0-6
  startLocal: string; // "HH:mm"
  windowMin: number;
  timezone: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  active: boolean;
}

/** One-off override to weekly availability (BFF AvailabilityExceptionResponse). */
export interface AvailabilityException {
  id: string;
  exceptionDate: string;
  kind: AvailabilityExceptionKind;
  startLocal: string;
  windowMin: number;
  reason: string | null;
}

/** Per-guide booking policy (BFF AvailabilitySettingsResponse). */
export interface AvailabilitySettings {
  guideId: string;
  acceptanceMode: "AUTO" | "MANUAL";
  responseDeadlineMin: number;
  minNoticeMin: number;
  maxAdvanceDays: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  durationsOffered: number[];
  timezone: string;
  updatedAt: string;
}

/** A materialized, absolute-instant availability span (UTC, `Z`-suffixed) or a bookable slot. */
export interface AvailabilityOccurrence {
  startAt: string;
  endAt: string;
}

/** GET /v1/availability — the backend-resolved (coalesced) read; the FE renders it, never
 *  re-coalesces rules itself. */
export interface ResolvedAvailability {
  rules: AvailabilityRule[];
  occurrences: AvailabilityOccurrence[];
  /** ISO dates where a DST spring-forward gap moved/skipped an occurrence — surfaced to the guide. */
  dstGapDays: string[];
  /** Derived readiness signal, passed through verbatim from backend (no recompute): true iff the
   *  guide has at least one materialized occurrence that has not yet ended, i.e. a participant
   *  could book right now. */
  bookable: boolean;
  /** Derived readiness signal, passed through verbatim from backend (no recompute): true iff the
   *  guide has at least one active weekly rule (an expired-but-active rule still counts; a
   *  soft-deleted/inactive rule does not). */
  hasWeeklyHours: boolean;
}

/** A booking whose scheduled window is covered by a rule/exception change — surfaced so the guide
 *  sees what a reduction in availability affects (the booking itself is never retroactively cancelled). */
export interface AffectedBooking {
  bookingId: string;
  bookingNumber: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
}

/** Shape returned by every availability write (POST/PATCH/DELETE): the mutated resource (or, for
 *  DELETE, the remaining list) plus any bookings the change affects. */
export interface AvailabilityWriteEnvelope<T> {
  data: T;
  affectedBookings: AffectedBooking[];
  meta?: Record<string, unknown>;
}

export interface CreateAvailabilityRuleInput {
  dayOfWeek: number;
  startLocal: string;
  windowMin: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  active?: boolean;
}

export type UpdateAvailabilityRuleInput = Partial<CreateAvailabilityRuleInput>;

/** One affected date's dry-run result from `GET /v1/availability/preview` (CTL-55 v2.1). */
export interface OverridePreviewDay {
  date: string;
  /** The "after" net-available windows for this date, in the same absolute-instant shape as
   *  {@link AvailabilityOccurrence} (reused — the FE never recomputes these, only renders them). */
  resultingWindows: AvailabilityOccurrence[];
  /** Weekly-rule windows this override would trim/replace on this date. */
  trimmed: {
    kind: AvailabilityExceptionKind;
    startLocal: string;
    windowMin: number;
  }[];
  /** True when saving the proposed override won't materialize this date — it falls outside the
   *  bookable horizon or is in the past (bff `OverridePreviewDaySchema.inert`). Passed through
   *  verbatim; the FE never recomputes it. */
  inert: boolean;
}

/** GET /v1/availability/preview — a date-specific override dry-run (Block/Add-extra), returned
 *  before the guide confirms a create. `valid`/`message` surface a would-be-422 without writing
 *  anything; the FE renders this as-is (before/after + trimmed), never recomputing it. */
export interface OverridePreviewResponse {
  days: OverridePreviewDay[];
  valid: boolean;
  message: string | null;
}

/** One proposed time window (start + duration) inside a multi-slot override preview/create. */
export interface OverrideWindow {
  startLocal: string;
  windowMin: number;
}

/** Body for the multi-window dry-run `POST /v1/availability/preview` (CTL-55 multi-slot). Posts N
 *  windows and the backend returns the NET result of ALL of them applied together — an
 *  {@link OverridePreviewResponse}. The FE renders that net result; it never merges the windows itself. */
export interface OverrideMultiPreviewParams {
  dateFrom: string;
  dateTo: string;
  kind: AvailabilityExceptionKind;
  windows: OverrideWindow[];
  /** When `true`, the dry-run shows the day as if this `kind`'s existing overrides are REPLACED
   *  by exactly `windows` (edits/removals render correctly; an EMPTY `windows` = that kind cleared
   *  for the day). Makes an editor's preview accurate. When omitted/false the backend treats
   *  `windows` as additive to whatever already exists. */
  replaceExisting?: boolean;
}

/** Body for `POST /v1/availability/overrides/replace` (CTL-55 v2.1 B2) — an ATOMIC single-day
 *  replace of ONE kind's date-specific overrides. The guide's existing same-kind exceptions for
 *  `date` are dropped and replaced by exactly `windows` in one backend transaction; an EMPTY
 *  `windows` list clears this kind for the day. Name-for-name with bff Contract A
 *  (`OverrideReplaceRequestSchema`): a single `date` (NOT `dateFrom`/`dateTo`). */
export interface OverrideReplaceInput {
  date: string;
  kind: AvailabilityExceptionKind;
  windows: OverrideWindow[];
}

/** Body for `POST /v1/availability/rules/replace` (CTL-55 v2.1 B2) — an ATOMIC replace of ONE
 *  weekday's recurring availability rules. The guide's existing ACTIVE rules for `dayOfWeek` are
 *  dropped and replaced by exactly `windows` in one backend transaction; an EMPTY `windows` list
 *  clears this weekday's rules. Name-for-name with bff Contract A (`RulesReplaceRequestSchema`):
 *  deliberately no `timezone`/`effectiveFrom`/`effectiveTo`/`kind` field. */
export interface RulesReplaceInput {
  dayOfWeek: number;
  windows: OverrideWindow[];
}

export interface UpdateAvailabilitySettingsInput {
  acceptanceMode?: "AUTO" | "MANUAL";
  responseDeadlineMin?: number;
  minNoticeMin?: number;
  maxAdvanceDays?: number;
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
  durationsOffered?: number[];
  timezone?: string;
}

/** GET /v1/offerings/{id}/slots — participant-facing bookable slots for an offering. */
export type OfferingSlot = AvailabilityOccurrence;
