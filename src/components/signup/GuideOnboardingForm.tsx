"use client";

/** Three-step guide onboarding wizard and submission workflow. */

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

const STEP_LEADS = [
  "Tell prospective students who you are and where you study.",
  "Show how you guide — the languages you speak, your specialties, and a short bio.",
  "Enter your school email — we’ll send a link to verify you’re a current student. Every application is reviewed before tours go live.",
] as const;

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
    shouldFocusError: false,
  });

  const selectedUniversity = watch("university")?.[0];
  const {
    data: majorOptions = [],
    isLoading: majorsLoading,
    isFetching: majorsFetching,
    isError: majorsErrored,
    refetch: refetchMajors,
  } = useMajors(selectedUniversity?.id);

  const majorsUnavailable =
    Boolean(selectedUniversity) && !majorsLoading && (majorsErrored || majorOptions.length === 0);

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

  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !me) return;
    prefilled.current = true;
    const prefill = getOnboardingPrefill(me);
    if (prefill.firstName && !getValues("firstName")) setValue("firstName", prefill.firstName);
    if (prefill.lastName && !getValues("lastName")) setValue("lastName", prefill.lastName);
  }, [me, setValue, getValues]);

  
  const buildBody = (values: FormValues): Omit<GuideProfileUpdate, "submit"> => ({
    firstName: /* istanbul ignore next */ values.firstName || undefined,
    lastName: /* istanbul ignore next */ values.lastName || undefined,
    universityId: /* istanbul ignore next */ values.university[0]?.id,
    major: /* istanbul ignore next */ values.major || undefined,
    classYear: values.classYear || undefined,
    entryYear: /* istanbul ignore next */ values.entryYear ? Number(values.entryYear) : undefined,
    degree: /* istanbul ignore next */ values.degree || undefined,
    bio: /* istanbul ignore next */ values.bio || undefined,
    spokenLanguages: values.languages,
    tourTopics: values.specialties,
    verificationEmail: values.schoolEmail,
  });

  
  const submitOnboarding = async (values: FormValues) => {
    setSubmitError(null);
    try {
      await onboardRole.mutateAsync({ role: "GUIDE", body: buildBody(values) });
    } catch (err) {
      if (err instanceof OnboardRetryableError) {
        setRetryMessage(err.message);
        return;
      }
      setRetryMessage(null);
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
        "entryYear",
        "classYear",
      ]);
      if (!ok) return;
    } else if (step === 1) {
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
      
      <div className="mb-8">
        <OnboardingBreadcrumb current="Guide onboarding" />
      </div>

      
      <div className="flex min-h-[640px] flex-col rounded-panel border border-border bg-card p-6 shadow-card sm:min-h-[700px] sm:p-9">
        
        <div className="flex items-center justify-between gap-4">
          <div className="eyebrow">Guide application</div>
          <OnboardingCancel dirty={isDirty} disabled={isSubmitting} />
        </div>
        <SectionHeading title="Set up your guide profile" lead={STEP_LEADS[step]} />

        
        <form onSubmit={onSubmit} noValidate className="mt-10 flex flex-1 flex-col">
          <WizardSteps steps={STEPS} current={step} className="mb-9" />

          
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

              
              <EnrollmentYearFields
                control={control}
                getValues={getValues}
                trigger={trigger}
                clearErrors={clearErrors}
              />
            </div>
          )}

          
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
                {isSubmitting ? "Submitting…" : isLast ? "Submit" : "Continue"}
              </Button>
            </ButtonRow>
          </div>
        </form>
      </div>
    </>
  );
}
