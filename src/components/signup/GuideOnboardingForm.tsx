"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { useMajors, useMe, useTourTopics, useUpdateGuideProfile } from "@/lib/data-access";
import {
  Alert,
  Body,
  Button,
  Chip,
  SectionHeading,
  SelectField,
  Spinner,
  TextField,
  Textarea,
} from "@/components/ui";
import { OnboardingBreadcrumb } from "@/components/site/OnboardingBreadcrumb";
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
  classYear: string;
  bio: string;
  languages: string[];
  specialties: string[];
  basePrice: string; // dollars, as typed
  schoolEmail: string;
}

const STEPS = ["About you", "Your guiding", "Verification"] as const;

// Languages are open BCP-47 tags (not a controlled backend vocabulary like
// tour_topic), so we offer a fixed common-language list client-side. The
// persisted value is the BCP-47 tag.
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
  const updateProfile = useUpdateGuideProfile();
  const [step, setStep] = useState(0);
  const { data: topicOptions = [] } = useTourTopics();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      university: [],
      major: "",
      classYear: "",
      bio: "",
      languages: ["en-US"],
      specialties: [],
      basePrice: "28",
      schoolEmail: "",
    },
    mode: "onSubmit",
  });

  // Majors are the fields of study the SELECTED school offers (live) — empty until one is picked.
  const selectedUniversity = watch("university")?.[0];
  const { data: majorOptions = [] } = useMajors(selectedUniversity?.id);

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

  // Tour specialties are a controlled backend vocabulary (tour_topic enum), loaded
  // via useTourTopics above. Languages are static (see LANGUAGES above).

  const persist = async (values: FormValues) => {
    setSubmitError(null);
    const dollars = Number(values.basePrice);
    const basePriceCents =
      values.basePrice && !Number.isNaN(dollars) ? Math.round(dollars * 100) : undefined;
    try {
      // onSuccess invalidates ["me"] + the guide profile (submit=true grants GUIDE),
      // so the header reflects it immediately. Land in the guide area.
      await updateProfile.mutateAsync({
        // firstName/lastName/university/major are required on step 1 → the fallbacks never run
        firstName: /* istanbul ignore next */ values.firstName || undefined,
        lastName: /* istanbul ignore next */ values.lastName || undefined,
        universityId: /* istanbul ignore next */ values.university[0]?.id,
        major: /* istanbul ignore next */ values.major || undefined,
        classYear: values.classYear || undefined,
        bio: values.bio || undefined,
        languages: values.languages,
        specialties: values.specialties,
        basePriceCents,
        verificationEmail: values.schoolEmail,
        submit: true,
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
      const ok = await trigger(["firstName", "lastName", "university", "major"]);
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

  return (
    <>
      {/* Breadcrumb — pure navigation (no action buttons). */}
      <div className="mb-8">
        <OnboardingBreadcrumb current="Guide onboarding" />
      </div>

      {/* Eyebrow row — Cancel aligns to it (✕ closes the task). */}
      <div className="flex items-center justify-between gap-4">
        <div className="eyebrow">Guide application</div>
        <OnboardingCancel dirty={isDirty} disabled={isSubmitting} />
      </div>
      <SectionHeading
        title="Set up your guide profile"
        lead="Tell prospective students about yourself and verify your current student status. Our team reviews each application before tours go live."
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="First name"
                autoComplete="given-name"
                placeholder="Jordan"
                error={errors.firstName?.message}
                {...register("firstName", {
                  required: "Please enter your first name.",
                })}
              />
              <TextField
                label="Last name"
                autoComplete="family-name"
                placeholder="Lee"
                error={errors.lastName?.message}
                {...register("lastName", {
                  required: "Please enter your last name.",
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
                  onChange={field.onChange}
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
                  <SelectField
                    label="Major"
                    error={errors.major?.message}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={!selectedUniversity}
                  >
                    <option value="">
                      {selectedUniversity ? "Select a major" : "Pick a university first"}
                    </option>
                    {field.value && !majorOptions.some((o) => o.value === field.value) ? (
                      <option value={field.value}>{field.value}</option>
                    ) : null}
                    {majorOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </SelectField>
                )}
              />
              <TextField
                label="Class year"
                optional
                placeholder="2027"
                {...register("classYear")}
              />
            </div>
          </div>
        )}

        {/* Step 2 — Your guiding (optional) */}
        {step === 1 && (
          <div className="flex flex-col gap-7">
            <Textarea
              label="Short bio"
              optional
              className="min-h-[96px]"
              placeholder="Tell prospective students a little about you and what makes your tours great."
              {...register("bio")}
            />

            <Controller
              control={control}
              name="languages"
              render={({ field }) => (
                <fieldset>
                  <Body as="legend" size="small" weight={700} className="mb-2 block">
                    Languages you can guide in
                  </Body>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((l) => {
                      const active = field.value.includes(l.value);
                      return (
                        <Chip
                          key={l.value}
                          active={active}
                          onClick={() =>
                            field.onChange(
                              active
                                ? field.value.filter((v) => v !== l.value)
                                : [...field.value, l.value],
                            )
                          }
                        >
                          {l.label}
                        </Chip>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            />

            <Controller
              control={control}
              name="specialties"
              render={({ field }) => (
                <fieldset>
                  <Body as="legend" size="small" weight={700} className="mb-2 block">
                    Tour specialties <span className="font-normal text-ink-soft">(optional)</span>
                  </Body>
                  {topicOptions.length === 0 ? (
                    <Body size="medium" color="muted">
                      Loading…
                    </Body>
                  ) : (
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
                </fieldset>
              )}
            />

            <TextField
              label="Base price per tour (USD)"
              optional
              type="number"
              min={20}
              max={200}
              fieldClassName="max-w-[220px]"
              error={errors.basePrice?.message}
              hint="You can fine-tune pricing per tour later. Default is $28."
              {...register("basePrice", {
                // redundant with the input's native min/max + server validation
                validate: /* istanbul ignore next */ (v) => {
                  if (!v) return true;
                  const n = Number(v);
                  if (Number.isNaN(n)) return "Enter a number.";
                  if (n < 20 || n > 200) return "Must be between $20 and $200.";
                  return true;
                },
              })}
            />
          </div>
        )}

        {/* Step 3 — Verification (required to submit) */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <TextField
              label="School email address"
              type="email"
              autoComplete="email"
              placeholder="you@university.edu"
              error={errors.schoolEmail?.message}
              {...register("schoolEmail", {
                required: "Enter your school email to verify your student status.",
                pattern: {
                  value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                  message: "Enter a valid email address.",
                },
              })}
            />
            <Alert variant="info" role="status">
              We use your school email to confirm you’re a current student. Your application is
              reviewed before any tours go live — you’ll keep access to your dashboard while it’s
              pending.
            </Alert>
          </div>
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
            {isSubmitting ? "Submitting…" : isLast ? "Submit" : "Continue"}
          </Button>
        </div>
      </form>
    </>
  );
}
