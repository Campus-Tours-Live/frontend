"use client";

import { useEffect, useRef, useState } from "react";
import { isAuthCancelled, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import {
  useMe,
  useSetActiveRole,
  useTourTopics,
  useUpdateParticipantProfile,
} from "@/lib/data-access";
import {
  Alert,
  Body,
  Button,
  ButtonRow,
  Checkbox,
  SectionHeading,
  SegmentedControl,
  TextField,
  WizardSteps,
} from "@/components/ui";
import { OnboardingBreadcrumb } from "@/components/site/OnboardingBreadcrumb";
import { NAME_MAX_LENGTH, sanitizeName, validateName } from "@/lib/validation/name";
import { UniversityField, type UniversityOption } from "./UniversityField";
import { OnboardingCancel } from "./OnboardingCancel";

interface FormValues {
  firstName: string;
  lastName: string;
  participantType: string;
  universities: UniversityOption[];
  topics: string[];
}

// Minimal participant types (Transfer/International live under topics).
const PARTICIPANT_TYPES = [
  { value: "PROSPECTIVE", label: "Prospective student" },
  { value: "PARENT", label: "Parent or guardian" },
] as const;

const STEPS = ["About you", "University interests", "Topic interests"] as const;

// One focused subtitle per step — the header title stays constant while the lead narrows to the
// step's purpose (the "why"), staying clear of the field-level "how" descriptions below.
const STEP_LEADS = [
  "Tell us who’s joining so we can personalize your tour recommendations.",
  "Add schools you’re considering to discover relevant tours and student guides.",
  "Choose what you’d like to explore so we can personalize your tour recommendations.",
] as const;

export function ParticipantOnboardingForm() {
  const router = useRouter();
  const { me } = useMe();
  const updateProfile = useUpdateParticipantProfile();
  const setActiveRole = useSetActiveRole();
  const [step, setStep] = useState(0);
  const { data: topicOptions = [] } = useTourTopics();
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set once onboarding has GRANTED the role (Core write succeeded) but the bff session's
  // activeRole switch hasn't (yet). Distinct from submitError: the profile IS saved, so the
  // retry below only re-runs the switch — never re-submits the onboarding form.
  const [sessionError, setSessionError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      participantType: "PROSPECTIVE",
      universities: [],
      topics: [],
    },
    mode: "onSubmit",
  });

  // Prefill the name from the account — a member acquiring a second role already
  // entered it for the first (or it came from Google at signup). Fills empty fields
  // once, without clobbering input or marking the form dirty.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !me) return;
    prefilled.current = true;
    if (me.user.firstName && !getValues("firstName")) setValue("firstName", me.user.firstName);
    if (me.user.lastName && !getValues("lastName")) setValue("lastName", me.user.lastName);
  }, [me, setValue, getValues]);

  // Onboarding partial-success: the submit above only GRANTS the role (Core write). The bff's
  // activeRole is separate per-session state (Profile Contract v2 — Core has no active-role
  // concept), so the form independently switches into the just-granted role afterward. If that
  // switch fails, the role is still held — this is a session-init failure, not a save failure —
  // so retry re-runs ONLY this, never the onboarding submit above.
  const activateSession = async () => {
    setSessionError(null);
    try {
      await setActiveRole.mutateAsync("PARTICIPANT");
      router.push("/dashboard");
    } catch (err) {
      setSessionError(
        isAuthCancelled(err)
          ? SIGN_IN_AGAIN_MESSAGE
          : "Your profile is saved. We couldn't switch you into participant mode — try again.",
      );
    }
  };

  const persist = async (values: FormValues) => {
    setSubmitError(null);
    try {
      // The mutation's onSuccess invalidates ["me"] + the participant profile, so
      // the header/dashboard reflect the just-granted role immediately.
      await updateProfile.mutateAsync({
        // names are required on step 1, so the `|| undefined` fallback is never taken
        firstName: /* istanbul ignore next */ values.firstName || undefined,
        lastName: /* istanbul ignore next */ values.lastName || undefined,
        participantType: values.participantType,
        universitiesOfInterest: values.universities.map((u) => u.id),
        topicsOfInterest: values.topics,
      });
    } catch (err) {
      setSubmitError(
        isAuthCancelled(err)
          ? SIGN_IN_AGAIN_MESSAGE
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      );
      return;
    }
    // The role is granted — land in the participant area only once the session reflects it.
    await activateSession();
  };

  const submit = handleSubmit(persist);
  const isLast = step === STEPS.length - 1;

  const advance = async () => {
    if (step === 0) {
      const ok = await trigger(["firstName", "lastName"]);
      if (!ok) return;
    }
    setStep((s) => s + 1);
  };

  // One submit handler: earlier steps advance; the last step actually submits.
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLast) void submit();
    else void advance();
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const bothNameMissing = Boolean(errors.firstName && errors.lastName);

  // Onboarding is DONE (the participant role is granted); only the session switch remains.
  // Replace the wizard with a dedicated retry panel — never let the participant re-fill and
  // re-submit a profile that's already saved.
  if (sessionError) {
    return (
      <>
        <div className="mb-8">
          <OnboardingBreadcrumb current="Onboarding" />
        </div>
        <div className="flex min-h-[640px] flex-col rounded-panel border border-border bg-card p-6 shadow-card sm:min-h-[700px] sm:p-9">
          <div className="eyebrow">Participant onboarding</div>
          <SectionHeading title="Tell us about yourself?" lead="Almost there." />
          <Alert variant="error" className="mt-6">
            {sessionError}
          </Alert>
          <ButtonRow className="mt-6">
            <Button onClick={() => void activateSession()} loading={setActiveRole.isPending}>
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
        <OnboardingBreadcrumb current="Onboarding" />
      </div>

      {/* Fixed min-height + flex column: the footer (Back/Continue/Submit) is pinned to the card
          bottom, and step content grows into the slack above it rather than pushing the buttons —
          so height stays put across steps and as content changes (e.g. adding schools). */}
      <div className="flex min-h-[640px] flex-col rounded-panel border border-border bg-card p-6 shadow-card sm:min-h-[700px] sm:p-9">
        {/* Eyebrow row — Cancel aligns to it (✕ closes the task). */}
        <div className="flex items-center justify-between gap-4">
          <div className="eyebrow">Participant onboarding</div>
          <OnboardingCancel dirty={isDirty} disabled={isSubmitting} />
        </div>
        <SectionHeading title="Tell us about yourself?" lead={STEP_LEADS[step]} />

        <form onSubmit={onSubmit} className="mt-10 flex flex-1 flex-col">
          <WizardSteps steps={STEPS} current={step} className="mb-9" />

          {/* Step 1 — About you (required) */}
          {step === 0 && (
            <div className="flex flex-col gap-7">
              <div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label="First name"
                    autoComplete="given-name"
                    placeholder="John"
                    maxLength={NAME_MAX_LENGTH}
                    error={bothNameMissing ? undefined : errors.firstName?.message}
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
                    error={bothNameMissing ? undefined : errors.lastName?.message}
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
                {bothNameMissing && (
                  <Body role="alert" size="small" weight={600} color="error" className="mt-2">
                    Please enter your first and last name to continue.
                  </Body>
                )}
              </div>

              <Controller
                control={control}
                name="participantType"
                render={({ field }) => (
                  <fieldset>
                    <legend className="form-label">I am joining as</legend>
                    {/* Two mutually-exclusive identities → single-select segmented control. */}
                    <SegmentedControl
                      aria-label="I am joining as"
                      options={PARTICIPANT_TYPES}
                      value={field.value as (typeof PARTICIPANT_TYPES)[number]["value"]}
                      onChange={field.onChange}
                    />
                  </fieldset>
                )}
              />
            </div>
          )}

          {/* Step 2 — Universities (optional) */}
          {step === 1 && (
            <Controller
              control={control}
              name="universities"
              render={({ field }) => (
                <UniversityField
                  label="Universities of interest"
                  description="Search for and add up to 5 schools. You can update these anytime in your profile."
                  optional
                  // Reserve a constant height so adding/removing schools doesn't resize the field
                  // (and jump the card). The selected list is capped + scrolls within this space.
                  // Inline (not a Tailwind class) so it applies reliably regardless of JIT.
                  style={{ minHeight: 384 }}
                  value={field.value}
                  onChange={field.onChange}
                  max={5}
                  // Live College Scorecard directory (every U.S. school), matching the guide flow.
                  // Selected ids are Scorecard school ids, submitted as universitiesOfInterest.
                  source="live"
                />
              )}
            />
          )}

          {/* Step 3 — Topics (optional) */}
          {step === 2 && (
            <fieldset>
              <legend className="form-label">
                Topics you’re interested in{" "}
                <span className="font-normal text-ink-soft">(optional)</span>
              </legend>
              <Body size="small" color="muted" className="mb-3">
                Select all that apply. You can update these anytime in your profile.
              </Body>
              {topicOptions.length === 0 ? (
                <Body size="medium" color="muted">
                  Loading topics…
                </Body>
              ) : (
                <Controller
                  control={control}
                  name="topics"
                  render={({ field }) => (
                    <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                      {topicOptions.map((t) => (
                        <Checkbox
                          key={t.value}
                          label={t.label}
                          checked={field.value.includes(t.value)}
                          onChange={(e) =>
                            field.onChange(
                              e.target.checked
                                ? [...field.value, t.value]
                                : field.value.filter((v) => v !== t.value),
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                />
              )}
            </fieldset>
          )}

          {/* Footer pinned to the bottom of the card (mt-auto), so the buttons stay put while the
              step content above grows/shrinks. pt-12 keeps a comfortable gap even when a dense step
              fills the card, so the buttons never look cramped against it. */}
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
                {isSubmitting ? "Saving…" : isLast ? "Submit" : "Continue"}
              </Button>
            </ButtonRow>
          </div>
        </form>
      </div>
    </>
  );
}
