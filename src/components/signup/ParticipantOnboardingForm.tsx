"use client";

/** Three-step participant onboarding wizard and submission workflow. */

import { useEffect, useRef, useState } from "react";
import { isAuthCancelled, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import {
  ApiError,
  getOnboardingPrefill,
  OnboardRetryableError,
  useMe,
  useOnboardRole,
  useTourTopics,
  type ParticipantProfileUpdate,
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

const PARTICIPANT_TYPES = [
  { value: "PROSPECTIVE", label: "Prospective student" },
  { value: "PARENT", label: "Parent or guardian" },
] as const;

const STEPS = ["About you", "University interests", "Topic interests"] as const;

const STEP_LEADS = [
  "Tell us who’s joining so we can personalize your tour recommendations.",
  "Add schools you’re considering to discover relevant tours and student guides.",
  "Choose what you’d like to explore so we can personalize your tour recommendations.",
] as const;

export function ParticipantOnboardingForm() {
  const router = useRouter();
  const { me } = useMe();
  const onboardRole = useOnboardRole();
  const [step, setStep] = useState(0);
  const { data: topicOptions = [] } = useTourTopics();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

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

  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !me) return;
    prefilled.current = true;
    const prefill = getOnboardingPrefill(me);
    if (prefill.firstName && !getValues("firstName")) setValue("firstName", prefill.firstName);
    if (prefill.lastName && !getValues("lastName")) setValue("lastName", prefill.lastName);
  }, [me, setValue, getValues]);

  
  const buildBody = (values: FormValues): ParticipantProfileUpdate => ({
    firstName: /* istanbul ignore next */ values.firstName || undefined,
    lastName: /* istanbul ignore next */ values.lastName || undefined,
    participantType: values.participantType,
    universitiesOfInterest: values.universities.map((u) => u.id),
    topicsOfInterest: values.topics,
  });

  
  const submitOnboarding = async (values: FormValues) => {
    setSubmitError(null);
    try {
      await onboardRole.mutateAsync({ role: "PARTICIPANT", body: buildBody(values) });
    } catch (err) {
      if (err instanceof OnboardRetryableError) {
        setRetryMessage(err.message);
        return;
      }
      setRetryMessage(null);
      setSubmitError(
        isAuthCancelled(err)
          ? SIGN_IN_AGAIN_MESSAGE
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

  const retry = () => submitOnboarding(getValues());

  const submit = handleSubmit(persist);
  const isLast = step === STEPS.length - 1;

  const advance = async () => {
    if (step === 0) {
      const ok = await trigger(["firstName", "lastName"]);
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

  const bothNameMissing = Boolean(errors.firstName && errors.lastName);

  if (retryMessage) {
    return (
      <>
        <div className="mb-8">
          <OnboardingBreadcrumb current="Onboarding" />
        </div>
        <div className="flex min-h-[640px] flex-col rounded-panel border border-border bg-card p-6 shadow-card sm:min-h-[700px] sm:p-9">
          <div className="eyebrow">Participant onboarding</div>
          <SectionHeading title="Tell us about yourself?" lead="Almost there." />
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
      
      <div className="mb-8">
        <OnboardingBreadcrumb current="Onboarding" />
      </div>

      
      <div className="flex min-h-[640px] flex-col rounded-panel border border-border bg-card p-6 shadow-card sm:min-h-[700px] sm:p-9">
        
        <div className="flex items-center justify-between gap-4">
          <div className="eyebrow">Participant onboarding</div>
          <OnboardingCancel dirty={isDirty} disabled={isSubmitting} />
        </div>
        <SectionHeading title="Tell us about yourself?" lead={STEP_LEADS[step]} />

        <form onSubmit={onSubmit} className="mt-10 flex flex-1 flex-col">
          <WizardSteps steps={STEPS} current={step} className="mb-9" />

          
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

          
          {step === 1 && (
            <Controller
              control={control}
              name="universities"
              render={({ field }) => (
                <UniversityField
                  label="Universities of interest"
                  description="Search for and add up to 5 schools. You can update these anytime in your profile."
                  optional
                  style={{ minHeight: 384 }}
                  value={field.value}
                  onChange={field.onChange}
                  max={5}
                  source="live"
                />
              )}
            />
          )}

          
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

          
          <div className="mt-auto pt-12">
            {submitError && (
              <Alert variant="error" className="mb-5">
                {submitError}
              </Alert>
            )}

            
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
