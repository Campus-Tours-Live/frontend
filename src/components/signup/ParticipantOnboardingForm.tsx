"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { useMe, useTourTopics, useUpdateParticipantProfile } from "@/lib/data-access";
import { Alert, Body, Button, Chip, Field, SectionHeading, Spinner } from "@/components/ui";
import { OnboardingBreadcrumb } from "@/components/site/OnboardingBreadcrumb";
import { UniversityMultiSelect, type UniversityOption } from "./UniversityMultiSelect";
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

const STEPS = ["About you", "Universities", "Topics"] as const;

export function ParticipantOnboardingForm() {
  const router = useRouter();
  const { me } = useMe();
  const updateProfile = useUpdateParticipantProfile();
  const [step, setStep] = useState(0);
  const { data: topicOptions = [] } = useTourTopics();
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    if (me.firstName && !getValues("firstName")) setValue("firstName", me.firstName);
    if (me.lastName && !getValues("lastName")) setValue("lastName", me.lastName);
  }, [me, setValue, getValues]);

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
      router.push("/dashboard");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    }
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

  return (
    <>
      {/* Breadcrumb — pure navigation (no action buttons). */}
      <div className="mb-8">
        <OnboardingBreadcrumb current="Onboarding" />
      </div>

      {/* Eyebrow row — Cancel aligns to it (✕ closes the task). */}
      <div className="flex items-center justify-between gap-4">
        <div className="eyebrow">Participant onboarding</div>
        <OnboardingCancel dirty={isDirty} disabled={isSubmitting} />
      </div>
      <SectionHeading
        title="Tell us what you’re exploring"
        lead="We use this to personalize tour recommendations and help guides prepare. Avoid sharing unnecessary sensitive information."
      />

      <form onSubmit={onSubmit} className="mt-10">
        {/* Progress */}
        <div
          className="mb-6 flex items-center gap-2"
          aria-label={`Step ${step + 1} of ${STEPS.length}`}
        >
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={cn(
                "h-2 rounded-pill transition-all",
                i === step ? "w-6 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-border",
              )}
            />
          ))}
          <Body as="span" size="small" color="muted" className="ml-2">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </Body>
        </div>

        {/* Step 1 — About you (required) */}
        {step === 0 && (
          <div className="flex flex-col gap-7">
            <div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="field">
                  <label htmlFor="firstName">First name</label>
                  <input
                    id="firstName"
                    className="input"
                    autoComplete="given-name"
                    placeholder="Jordan"
                    aria-invalid={!!errors.firstName}
                    {...register("firstName", {
                      required: "Please enter your first name.",
                    })}
                  />
                  {errors.firstName && !bothNameMissing && (
                    <Body role="alert" size="small" weight={600} color="error" className="mt-1">
                      {errors.firstName.message}
                    </Body>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="lastName">Last name</label>
                  <input
                    id="lastName"
                    className="input"
                    autoComplete="family-name"
                    placeholder="Lee"
                    aria-invalid={!!errors.lastName}
                    {...register("lastName", {
                      required: "Please enter your last name.",
                    })}
                  />
                  {errors.lastName && !bothNameMissing && (
                    <Body role="alert" size="small" weight={600} color="error" className="mt-1">
                      {errors.lastName.message}
                    </Body>
                  )}
                </div>
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
                  <Body as="legend" size="small" weight={700} className="mb-2 block">
                    I am a…
                  </Body>
                  <div className="flex flex-wrap gap-2">
                    {PARTICIPANT_TYPES.map((t) => (
                      <Chip
                        key={t.value}
                        active={field.value === t.value}
                        onClick={() => field.onChange(t.value)}
                      >
                        {t.label}
                      </Chip>
                    ))}
                  </div>
                </fieldset>
              )}
            />
          </div>
        )}

        {/* Step 2 — Universities (optional) */}
        {step === 1 && (
          <Field
            label="Universities of interest"
            htmlFor="onboarding-participant-universities"
            description="Search and add the campuses you want to explore. Optional — you can add or change these anytime in your profile."
            optional
          >
            <Controller
              control={control}
              name="universities"
              render={({ field }) => (
                <UniversityMultiSelect
                  id="onboarding-participant-universities"
                  value={field.value}
                  onChange={field.onChange}
                  max={5}
                />
              )}
            />
          </Field>
        )}

        {/* Step 3 — Topics (optional) */}
        {step === 2 && (
          <fieldset>
            <Body as="legend" size="small" weight={700} className="mb-2 block">
              Topics you care about <span className="font-normal text-ink-soft">(optional)</span>
            </Body>
            <Body size="medium" color="muted" className="mb-3">
              Optional — you can change these anytime in your profile.
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
                  <div className="flex flex-wrap gap-2">
                    {topicOptions.map((t) => {
                      const active = field.value.includes(t.value);
                      return (
                        <Chip
                          key={t.value}
                          active={active}
                          onClick={() =>
                            field.onChange(
                              active
                                ? field.value.filter((v) => v !== t.value)
                                : [...field.value, t.value],
                            )
                          }
                        >
                          {t.label}
                        </Chip>
                      );
                    })}
                  </div>
                )}
              />
            )}
          </fieldset>
        )}

        {submitError && (
          <Alert variant="error" className="mt-5">
            {submitError}
          </Alert>
        )}

        {/* Nav — step navigation only (Back / Continue); Cancel lives top-right. */}
        <div className="mt-8 flex items-center justify-end gap-3">
          {step > 0 && (
            <Button variant="ghost" onClick={back} disabled={isSubmitting}>
              Back
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            {isSubmitting ? "Saving…" : isLast ? "Submit" : "Continue"}
          </Button>
        </div>
      </form>
    </>
  );
}
