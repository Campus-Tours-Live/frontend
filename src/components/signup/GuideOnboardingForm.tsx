"use client";

import { useEffect, useRef, useState } from "react";
import { isAuthCancelled, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import {
  ApiError,
  getOnboardingPrefill,
  OnboardRetryableError,
  useDegrees,
  useMajors,
  useMe,
  useOnboardRole,
  useTourTopics,
  type GuideProfileUpdate,
} from "@/lib/data-access";
import {
  Alert,
  Body,
  Button,
  ButtonRow,
  Checkbox,
  SectionHeading,
  SelectMenu,
  TextField,
  Textarea,
  WizardSteps,
} from "@/components/ui";
import { OnboardingBreadcrumb } from "@/components/site/OnboardingBreadcrumb";
import { NAME_MAX_LENGTH, sanitizeName, validateName } from "@/lib/validation/name";
import { EnrollmentYearFields } from "./EnrollmentYearFields";
import { UniversityField, type UniversityOption } from "./UniversityField";
import { OnboardingCancel } from "./OnboardingCancel";

interface Option {
  value: string;
  label: string;
}

interface FormValues {
  firstName: string;
  lastName: string;
  university: UniversityOption[];
  major: string;
  degree: string;
  classYear: string;
  entryYear: string;
  bio: string;
  languages: string[];
  specialties: string[];
  schoolEmail: string;
}

const STEPS = ["About you", "Your guiding", "Student verification"] as const;

// One focused subtitle per step — the header title stays constant while the lead narrows to the
// task at hand, so Step 3 reads as "verify" rather than repeating the whole-flow summary.
const STEP_LEADS = [
  "Tell prospective students who you are and where you study.",
  "Show how you guide — the languages you speak, your specialties, and a short bio.",
  "Enter your school email — we’ll send a link to verify you’re a current student. Every application is reviewed before tours go live.",
] as const;

// Languages are open BCP-47 tags (not a controlled backend vocabulary like
// tour_topic), so we offer a fixed common-language list client-side. The
// persisted value is the BCP-47 tag.
// Same copy as the pre-signup `/signup/role?error=parent_no_guide` banner (the role page can
// only bounce a PARENT before onboarding even starts; this is the same ineligibility surfacing
// from a second-role acquisition attempt instead) — keyed on the command's `ROLE_NOT_ELIGIBLE`
// code + `properties.role === "GUIDE"`, never on message text.
const PARENT_NO_GUIDE_MESSAGE =
  "Parent or guardian accounts can’t become guides. You can continue as a participant.";

const LANGUAGES: Option[] = [
  { value: "en-US", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "zh", label: "Chinese (Mandarin)" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
  { value: "fr", label: "French" },
  { value: "ko", label: "Korean" },
  { value: "ja", label: "Japanese" },
  { value: "pt", label: "Portuguese" },
  { value: "de", label: "German" },
];

export function GuideOnboardingForm() {
  const router = useRouter();
  const { me } = useMe();
  const onboardRole = useOnboardRole();
  const [step, setStep] = useState(0);
  const { data: topicOptions = [] } = useTourTopics();
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set when the command resolves STILL_PENDING (OnboardRetryableError) — Core's commit state is
  // genuinely ambiguous, so this is neither a save failure nor a confirmed grant. Distinct from
  // submitError: the form stays filled and retry RESUBMITS the same command, it never re-runs a
  // separate session step (there is none any more — the command itself is session-usable once
  // resolved).
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      university: [],
      major: "",
      degree: "",
      classYear: "",
      entryYear: "",
      bio: "",
      languages: ["en-US"],
      specialties: [],
      schoolEmail: "",
    },
    mode: "onSubmit",
    // Don't auto-focus the first invalid field on submit: our fields clear their own error on
    // focus (a deliberate UX choice), so RHF focusing the field would instantly wipe the error it
    // just set — e.g. submitting an empty school email would show no message at all.
    shouldFocusError: false,
  });

  // Majors are the fields of study the SELECTED school offers (live) — empty until one is picked.
  const selectedUniversity = watch("university")?.[0];
  const {
    data: majorOptions = [],
    isLoading: majorsLoading,
    // `isLoading` is `isPending && isFetching` — true only on the FIRST load. A retry runs against
    // an already-settled query (isPending false), so it would leave `isLoading` false and the retry
    // would give no feedback at all. `isFetching` is what covers "a fetch is in flight right now".
    isFetching: majorsFetching,
    isError: majorsErrored,
    refetch: refetchMajors,
  } = useMajors(selectedUniversity?.id);

  // Major is REQUIRED and its options come from a live upstream (College Scorecard). The Core
  // swallows an upstream outage into an empty list, so the query SUCCEEDS with `[]` — meaning
  // "settled but empty" is the realistic degradation signal, not `isError`. Without this the
  // dropdown just sits permanently empty with no explanation and onboarding dead-ends on a field
  // the guide cannot fill.
  const majorsUnavailable =
    Boolean(selectedUniversity) && !majorsLoading && (majorsErrored || majorOptions.length === 0);

  // Degree levels the SELECTED school awards (live) — empty until a university is picked, the same
  // per-school dependency as majors. Optional, and it also sets the upper bound for class year.
  const {
    data: degreeOptions = [],
    isLoading: degreesLoading,
    isFetching: degreesFetching,
    isError: degreesErrored,
    refetch: refetchDegrees,
  } = useDegrees(selectedUniversity?.id);
  const degreesUnavailable =
    Boolean(selectedUniversity) &&
    !degreesLoading &&
    (degreesErrored || degreeOptions.length === 0);

  // Prefill the name from the account — a member acquiring a second role already
  // entered it for the first (or it came from Google at signup). Fills empty fields
  // once, without clobbering input or marking the form dirty.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !me) return;
    prefilled.current = true;
    const prefill = getOnboardingPrefill(me);
    if (prefill.firstName && !getValues("firstName")) setValue("firstName", prefill.firstName);
    if (prefill.lastName && !getValues("lastName")) setValue("lastName", prefill.lastName);
  }, [me, setValue, getValues]);

  // Tour specialties are a controlled backend vocabulary (tour_topic enum), loaded
  // via useTourTopics above. Languages are static (see LANGUAGES above).

  /** Maps the wizard's form values to the onboarding COMMAND body (the same field mapping the old
   *  PATCH-submit used, minus `submit` — the command endpoint has no such field). */
  const buildBody = (values: FormValues): Omit<GuideProfileUpdate, "submit"> => ({
    // firstName/lastName/university/major are required on step 1 → the fallbacks never run
    firstName: /* istanbul ignore next */ values.firstName || undefined,
    lastName: /* istanbul ignore next */ values.lastName || undefined,
    universityId: /* istanbul ignore next */ values.university[0]?.id,
    major: /* istanbul ignore next */ values.major || undefined,
    classYear: values.classYear || undefined,
    // entryYear is required on step 1 → the fallback never runs
    entryYear: /* istanbul ignore next */ values.entryYear ? Number(values.entryYear) : undefined,
    // degree + bio are required (steps 1 and 2), so the `|| undefined` fallback is never taken
    degree: /* istanbul ignore next */ values.degree || undefined,
    bio: /* istanbul ignore next */ values.bio || undefined,
    spokenLanguages: values.languages,
    tourTopics: values.specialties,
    verificationEmail: values.schoolEmail,
  });

  /**
   * One command call, reconcile-driven navigation: `onboardRole.mutateAsync` only RESOLVES a
   * `ProvisionedMe` once the GUIDE role is CONFIRMED held (its own 201, or an internal §4.3
   * reconcile) — there is no separate "activate session" step any more, so a resolve here IS the
   * "session usable + currentRole set" signal and is the ONLY path that navigates.
   *
   * Shared by both the wizard's Submit (`persist`) and the retry panel (`retry`) below, so a
   * STILL_PENDING retry resubmits the EXACT same mapped body rather than re-deriving it.
   */
  const submitOnboarding = async (values: FormValues) => {
    setSubmitError(null);
    try {
      await onboardRole.mutateAsync({ role: "GUIDE", body: buildBody(values) });
    } catch (err) {
      // Core's commit state is genuinely ambiguous (§4.3 STILL_PENDING) — not a terminal failure,
      // so no submitError message; the retry panel below owns its own copy.
      if (err instanceof OnboardRetryableError) {
        setRetryMessage(err.message);
        return;
      }
      setRetryMessage(null);
      // Keyed on the machine code + the `role` extension property, NEVER on message text — a
      // PARENT participant's second-role GUIDE attempt is the only 409 with its own copy.
      const parentIneligible =
        err instanceof ApiError &&
        err.code === "ROLE_NOT_ELIGIBLE" &&
        err.properties?.role === "GUIDE";
      setSubmitError(
        isAuthCancelled(err)
          ? SIGN_IN_AGAIN_MESSAGE
          : parentIneligible
            ? PARENT_NO_GUIDE_MESSAGE
            : err instanceof ApiError
              ? err.message
              : "Something went wrong. Please try again.",
      );
      return;
    }
    setRetryMessage(null);
    router.push("/dashboard");
  };

  const persist = (values: FormValues) => submitOnboarding(values);

  // Resubmits the LAST wizard values (react-hook-form retains them once submitted — nothing here
  // clears or resets the form) — never a fresh partial re-fill, and never a separate session call.
  const retry = () => submitOnboarding(getValues());

  const submit = handleSubmit(persist);
  const isLast = step === STEPS.length - 1;

  const advance = async () => {
    if (step === 0) {
      const ok = await trigger([
        "firstName",
        "lastName",
        "university",
        "major",
        "degree",
        // Visual order — entryYear is the input to classYear's window, and RHF reports errors in
        // the order it validates them.
        "entryYear",
        "classYear",
      ]);
      if (!ok) return;
    } else if (step === 1) {
      // Languages (≥1), specialties (≥1), and bio are all required to leave "Your guiding".
      const ok = await trigger(["languages", "specialties", "bio"]);
      if (!ok) return;
    }
    setStep((s) => s + 1);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLast) void submit();
    else void advance();
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  // Core's commit state is ambiguous (§4.3 STILL_PENDING) — the role may or may not be held yet.
  // Replace the wizard with a dedicated retry panel rather than a full re-fill: `retry` resubmits
  // the SAME mapped body (a re-POST of an already-granted role reconciles to a resolve, never a
  // duplicate grant).
  if (retryMessage) {
    return (
      <>
        <div className="mb-8">
          <OnboardingBreadcrumb current="Guide onboarding" />
        </div>
        <div className="flex min-h-[640px] flex-col rounded-panel border border-border bg-card p-6 shadow-card sm:min-h-[700px] sm:p-9">
          <div className="eyebrow">Guide application</div>
          <SectionHeading title="Set up your guide profile" lead="Almost there." />
          <Alert variant="error" className="mt-6">
            {retryMessage}
          </Alert>
          <ButtonRow className="mt-6">
            <Button onClick={() => void retry()} loading={onboardRole.isPending}>
              Try again
            </Button>
          </ButtonRow>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Breadcrumb — pure navigation (no action buttons). */}
      <div className="mb-8">
        <OnboardingBreadcrumb current="Guide onboarding" />
      </div>

      {/* Fixed min-height + flex column: the footer (Back/Continue/Submit) is pinned to the card
          bottom, and step content grows into the slack above it rather than pushing the buttons —
          so height stays put across steps and as content changes (e.g. adding schools). */}
      <div className="flex min-h-[640px] flex-col rounded-panel border border-border bg-card p-6 shadow-card sm:min-h-[700px] sm:p-9">
        {/* Eyebrow row — Cancel aligns to it (✕ closes the task). */}
        <div className="flex items-center justify-between gap-4">
          <div className="eyebrow">Guide application</div>
          <OnboardingCancel dirty={isDirty} disabled={isSubmitting} />
        </div>
        <SectionHeading title="Set up your guide profile" lead={STEP_LEADS[step]} />

        {/* `noValidate`: entry year carries the DOM `required` attribute (so assistive tech knows
            it is required), but react-hook-form owns validation and messaging. Without this the
            browser's own constraint check would silently swallow the submit and show a native
            bubble instead of the field's error — two validators, one of them invisible to us. */}
        <form onSubmit={onSubmit} noValidate className="mt-10 flex flex-1 flex-col">
          <WizardSteps steps={STEPS} current={step} className="mb-9" />

          {/* Step 1 — About you (required) */}
          {step === 0 && (
            <div className="flex flex-col gap-7">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="First name"
                  autoComplete="given-name"
                  placeholder="John"
                  maxLength={NAME_MAX_LENGTH}
                  error={errors.firstName?.message}
                  onFocus={() => clearErrors("firstName")}
                  {...register("firstName", {
                    required: "Please enter your first name.",
                    validate: validateName,
                    onChange: (e) => {
                      const cleaned = sanitizeName(e.target.value);
                      if (cleaned !== e.target.value) setValue("firstName", cleaned);
                    },
                  })}
                />
                <TextField
                  label="Last name"
                  autoComplete="family-name"
                  placeholder="Doe"
                  maxLength={NAME_MAX_LENGTH}
                  error={errors.lastName?.message}
                  onFocus={() => clearErrors("lastName")}
                  {...register("lastName", {
                    required: "Please enter your last name.",
                    validate: validateName,
                    onChange: (e) => {
                      const cleaned = sanitizeName(e.target.value);
                      if (cleaned !== e.target.value) setValue("lastName", cleaned);
                    },
                  })}
                />
              </div>

              <Controller
                control={control}
                name="university"
                rules={{
                  validate: (v) => v.length > 0 || "Select the university you currently attend.",
                }}
                render={({ field }) => (
                  <UniversityField
                    label="Your university"
                    description="Search any U.S. university you currently attend."
                    error={errors.university?.message as string}
                    value={field.value}
                    onChange={(next) => {
                      field.onChange(next);
                      // Major & degree are gated on the university; clearing it clears theirs too.
                      if (next.length > 0) clearErrors(["university", "major", "degree"]);
                    }}
                    onFocus={() => clearErrors(["university", "major", "degree"])}
                    max={1}
                    source="live"
                  />
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="major"
                  rules={{ required: "Please select your major." }}
                  render={({ field }) => (
                    <div>
                      <SelectMenu
                        label="Major"
                        value={field.value}
                        onChange={field.onChange}
                        onFocus={() => clearErrors("major")}
                        disabled={!selectedUniversity || majorsLoading}
                        error={errors.major?.message}
                        placeholder={
                          !selectedUniversity
                            ? "Pick a university first"
                            : majorsLoading
                              ? "Loading majors…"
                              : "Select a major"
                        }
                        searchPlaceholder="Search majors…"
                        // Keep a previously chosen major as a fallback option after switching schools.
                        options={
                          field.value && !majorOptions.some((o) => o.value === field.value)
                            ? [{ value: field.value, label: field.value }, ...majorOptions]
                            : majorOptions
                        }
                      />
                      {majorsUnavailable ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2">
                          <Body as="p" size="small" color="muted">
                            Couldn&apos;t load majors for this school.
                          </Body>
                          <Button
                            type="button"
                            variant="ghost"
                            size="small"
                            disabled={majorsFetching}
                            onClick={() => void refetchMajors()}
                          >
                            {majorsFetching ? "Trying…" : "Try again"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="degree"
                  rules={{ required: "Please select your degree." }}
                  render={({ field }) => (
                    <div>
                      <SelectMenu
                        label="Degree"
                        value={field.value}
                        onChange={field.onChange}
                        onFocus={() => clearErrors("degree")}
                        disabled={!selectedUniversity || degreesLoading}
                        error={errors.degree?.message}
                        placeholder={
                          !selectedUniversity
                            ? "Pick a university first"
                            : degreesLoading
                              ? "Loading degrees…"
                              : "Select a degree"
                        }
                        searchPlaceholder="Search degrees…"
                        options={
                          field.value && !degreeOptions.some((o) => o.value === field.value)
                            ? [{ value: field.value, label: field.value }, ...degreeOptions]
                            : degreeOptions
                        }
                      />
                      {degreesUnavailable ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2">
                          <Body as="p" size="small" color="muted">
                            Couldn&apos;t load degrees for this school.
                          </Body>
                          <Button
                            type="button"
                            variant="ghost"
                            size="small"
                            disabled={degreesFetching}
                            onClick={() => void refetchDegrees()}
                          >
                            {degreesFetching ? "Trying…" : "Try again"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
                />
              </div>

              {/* Entry year + class year + the rules-unavailable retry, all of it shared with
                  GuideProfileForm. Everything about these two fields — order, the required rule,
                  the gate, the windows, the copy — lives in that component, so a change here
                  cannot land in one form and miss the other. */}
              <EnrollmentYearFields
                control={control}
                getValues={getValues}
                trigger={trigger}
                clearErrors={clearErrors}
              />
            </div>
          )}

          {/* Step 2 — Your guiding (optional) */}
          {step === 1 && (
            <div className="flex flex-col gap-7">
              <Textarea
                label="Short bio"
                className="min-h-[96px]"
                maxLength={500}
                description="Share your major, year, campus interests, and what students can expect from your tour."
                placeholder="e.g. Third-year CS major who loves the maker space and late-night library runs."
                error={errors.bio?.message}
                onFocus={() => clearErrors("bio")}
                {...register("bio", { required: "Please add a short bio." })}
              />

              <Controller
                control={control}
                name="languages"
                rules={{ validate: (v) => v.length >= 1 || "Choose at least one language." }}
                render={({ field }) => (
                  <fieldset>
                    <legend className="form-label">Languages you can guide in</legend>
                    <Body size="small" color="muted" className="mb-2 block">
                      Select all that apply. English is on by default; keep at least one.
                    </Body>
                    <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                      {LANGUAGES.map((l) => (
                        <Checkbox
                          key={l.value}
                          label={l.label}
                          checked={field.value.includes(l.value)}
                          onChange={(e) => {
                            field.onChange(
                              e.target.checked
                                ? [...field.value, l.value]
                                : field.value.filter((v) => v !== l.value),
                            );
                            if (errors.languages) clearErrors("languages");
                          }}
                        />
                      ))}
                    </div>
                    {errors.languages ? (
                      <Body role="alert" size="small" weight={600} color="error" className="mt-2">
                        {errors.languages.message as string}
                      </Body>
                    ) : null}
                  </fieldset>
                )}
              />

              <Controller
                control={control}
                name="specialties"
                rules={{ validate: (v) => v.length >= 1 || "Choose at least one specialty." }}
                render={({ field }) => (
                  <fieldset>
                    <legend className="form-label">Tour specialties</legend>
                    <Body size="small" color="muted" className="mb-2.5 block">
                      Select all that apply.
                    </Body>
                    {topicOptions.length === 0 ? (
                      <Body size="medium" color="muted">
                        Loading…
                      </Body>
                    ) : (
                      <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                        {topicOptions.map((t) => (
                          <Checkbox
                            key={t.value}
                            label={t.label}
                            checked={field.value.includes(t.value)}
                            onChange={(e) => {
                              field.onChange(
                                e.target.checked
                                  ? [...field.value, t.value]
                                  : field.value.filter((v) => v !== t.value),
                              );
                              if (errors.specialties) clearErrors("specialties");
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {errors.specialties ? (
                      <Body role="alert" size="small" weight={600} color="error" className="mt-2">
                        {errors.specialties.message as string}
                      </Body>
                    ) : null}
                  </fieldset>
                )}
              />
            </div>
          )}

          {/* Step 3 — Verification (required to submit) */}
          {step === 2 && (
            <TextField
              label="School email address"
              type="email"
              autoComplete="email"
              placeholder="you@university.edu"
              error={errors.schoolEmail?.message}
              onFocus={() => clearErrors("schoolEmail")}
              {...register("schoolEmail", {
                required: "Enter your school email so we can send your verification link.",
                pattern: {
                  value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                  message: "Enter a valid email address.",
                },
              })}
            />
          )}

          {/* Footer pinned to the bottom of the card (mt-auto), so the buttons stay put while the
              step content above grows/shrinks. pt-12 keeps a comfortable gap even when a dense step
              (e.g. guide step 1) fills the card, so the buttons never look cramped against it. */}
          <div className="mt-auto pt-12">
            {submitError && (
              <Alert variant="error" className="mb-5">
                {submitError}
              </Alert>
            )}

            {/* Nav — step navigation only (Back / Continue); Cancel lives top-right. The empty span
                keeps a lone Continue right-aligned when there's no Back to sit opposite it. */}
            <ButtonRow align="between">
              {step > 0 ? (
                <Button variant="ghost" onClick={back} disabled={isSubmitting}>
                  Back
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? "Submitting…" : isLast ? "Submit" : "Continue"}
              </Button>
            </ButtonRow>
          </div>
        </form>
      </div>
    </>
  );
}
