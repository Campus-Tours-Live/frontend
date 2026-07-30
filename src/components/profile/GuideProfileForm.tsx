"use client";

import { useEffect, useState } from "react";
import { formSubmitErrorMessage } from "@/lib/errors";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Body,
  Button,
  Card,
  Chip,
  SelectField,
  Spinner,
  TextField,
  Textarea,
} from "@/components/ui";
import {
  ApiError,
  useDegrees,
  useMajors,
  useMe,
  useTourTopics,
  useUpdateGuideProfile,
  type GuideProfile,
  type MeUser,
} from "@/lib/data-access";
import { EnrollmentYearFields } from "@/components/signup/EnrollmentYearFields";
import { UniversityField, type UniversityOption } from "@/components/signup/UniversityField";

const LANGUAGES = [
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
] as const;

interface FormValues {
  firstName: string;
  lastName: string;
  university: UniversityOption[];
  major: string;
  /** Required by the server (CTL-96) AND the input to class year's ceiling — not optional here. */
  degree: string;
  classYear: string;
  entryYear: string;
  bio: string;
  languages: string[];
  specialties: string[];
}

export interface GuideProfileFormProps {
  profile: GuideProfile;
}

function universitySeed(profile: GuideProfile): UniversityOption[] {
  const university = profile.universities?.[0];
  if (!university?.universityId || !university.universityName) return [];
  return [
    {
      id: university.universityId,
      name: university.universityName,
      shortName: university.universityShortName ?? null,
    },
  ];
}

function toFormValues(
  profile: GuideProfile,
  identity?: Pick<MeUser, "firstName" | "lastName"> | null,
): FormValues {
  const university = profile.universities?.[0];
  return {
    firstName: identity?.firstName ?? "",
    lastName: identity?.lastName ?? "",
    university: universitySeed(profile),
    major: university?.major ?? "",
    degree: university?.degree ?? "",
    classYear: university?.classYear ?? "",
    entryYear: university?.entryYear?.toString() ?? "",
    bio: profile.bio ?? "",
    languages: profile.spokenLanguages?.length ? profile.spokenLanguages : ["en-US"],
    specialties: profile.tourTopics ?? [],
  };
}

export function GuideProfileForm({ profile }: GuideProfileFormProps) {
  const { me } = useMe();
  const updateProfile = useUpdateGuideProfile();
  const { data: topicOptions = [], isLoading: topicsLoading } = useTourTopics();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    handleSubmit,
    reset,
    trigger,
    getValues,
    clearErrors,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    defaultValues: toFormValues(profile, me?.user),
  });

  // Majors are the fields of study the SELECTED school actually offers (live). Empty until a school
  // is picked, and empty for a pre-existing local university (whose id isn't a Scorecard id) — the
  // saved major is preserved as a fallback option so editing other fields never loses it.
  const selectedUniversity = watch("university")?.[0];
  const { data: majorOptions = [] } = useMajors(selectedUniversity?.id);
  // Degree levels the SELECTED school awards — the same live source the onboarding form uses, so
  // the two forms offer the same vocabulary and neither hardcodes a list.
  const { data: degreeOptions = [] } = useDegrees(selectedUniversity?.id);

  useEffect(() => {
    reset(toFormValues(profile, me?.user));
  }, [profile, me, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaveMessage(null);

    // Defence-in-depth: the Controller's rules.validate already blocks submit on an
    // empty selection, so this only fires for the [null] slot case.
    const university = values.university[0];
    if (!university) {
      setError("university", { message: "University is required" });
      return;
    }

    try {
      await updateProfile.mutateAsync({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        universityId: university.id,
        major: values.major.trim(),
        // degree and entryYear are REQUIRED by the server, so they go unconditionally: on the wire
        // `undefined` means "leave alone", and a `values.x ? … : undefined` fallback would turn a
        // cleared field into a silent no-op — the server keeping the old value while the form
        // reports success. Both fields are required in the form, so submit is unreachable empty.
        degree: values.degree.trim(),
        classYear: values.classYear.trim() || undefined,
        entryYear: Number(values.entryYear),
        bio: values.bio.trim() || undefined,
        spokenLanguages: values.languages,
        tourTopics: values.specialties,
      });
      setSaveMessage("Profile saved.");
    } catch (err) {
      const message = formSubmitErrorMessage(err, {
        invalid: "Check your inputs — name, university, major, and entry year are required.",
        generic: "Could not save your profile. Please try again.",
      });
      setError("root", { message });
    }
  });

  return (
    // `noValidate` for the same reason GuideOnboardingForm carries it: EnrollmentYearFields puts
    // the DOM `required` attribute on entry year (so assistive tech knows), but react-hook-form
    // owns validation and messaging. Without it the browser's own constraint check fails first and
    // the `submit` event is never fired at all — handleSubmit never runs, and Save silently does
    // nothing.
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {errors.root ? <Alert variant="error">{errors.root.message}</Alert> : null}
      {saveMessage ? <Alert variant="success">{saveMessage}</Alert> : null}

      <Card padded={false} className="space-y-5 rounded-panel p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="First name"
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register("firstName", { required: "First name is required" })}
          />
          <TextField
            label="Last name"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register("lastName", { required: "Last name is required" })}
          />
        </div>

        <Controller
          control={control}
          name="university"
          rules={{
            validate: (value) => value.length > 0 || "University is required",
          }}
          render={({ field }) => (
            <UniversityField
              label="University"
              description="Search any U.S. university."
              error={errors.university?.message}
              value={field.value}
              onChange={field.onChange}
              max={1}
              source="live"
            />
          )}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            control={control}
            name="major"
            rules={{ required: "Major is required" }}
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
          <Controller
            control={control}
            name="degree"
            // Same wording as GuideOnboardingForm's degree rule — one field, one message. Nothing
            // shared owns degree yet, so this is kept in step by hand (and by the test below).
            rules={{ required: "Please select your degree." }}
            render={({ field }) => (
              <SelectField
                label="Degree"
                error={errors.degree?.message}
                value={field.value}
                onChange={field.onChange}
                disabled={!selectedUniversity}
              >
                <option value="">
                  {selectedUniversity ? "Select a degree" : "Pick a university first"}
                </option>
                {/* Keep the saved degree selectable when the live list doesn't offer it — the
                    server requires the field, so editing anything else must never blank it. */}
                {field.value && !degreeOptions.some((o) => o.value === field.value) ? (
                  <option value={field.value}>{field.value}</option>
                ) : null}
                {degreeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
            )}
          />
        </div>

        {/* Entry year + class year + the rules-unavailable retry — the same component
            GuideOnboardingForm renders, so the order, the required rule, the gate, the windows and
            the copy cannot land in one form and miss the other. */}
        <EnrollmentYearFields
          control={control}
          getValues={getValues}
          trigger={trigger}
          clearErrors={clearErrors}
        />

        <Textarea
          label="Short bio"
          optional
          rows={4}
          placeholder="Tell prospective students a little about you and what makes your tours great."
          {...register("bio")}
        />

        <Controller
          control={control}
          name="languages"
          render={({ field }) => (
            <fieldset>
              <Body as="legend" size="small" weight={600} className="mb-2 block">
                Languages you can guide in
              </Body>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((language) => {
                  const active = field.value.includes(language.value);
                  return (
                    <Chip
                      key={language.value}
                      active={active}
                      onClick={() =>
                        field.onChange(
                          active
                            ? field.value.filter((value) => value !== language.value)
                            : [...field.value, language.value],
                        )
                      }
                    >
                      {language.label}
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
              <Body as="legend" size="small" weight={600} className="mb-2 block">
                Tour specialties <span className="font-normal text-ink-soft">(optional)</span>
              </Body>
              {topicsLoading ? (
                <Body size="medium" color="muted">
                  Loading…
                </Body>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topicOptions.map((topic) => {
                    const active = field.value.includes(topic.value);
                    return (
                      <Chip
                        key={topic.value}
                        active={active}
                        onClick={() =>
                          field.onChange(
                            active
                              ? field.value.filter((value) => value !== topic.value)
                              : [...field.value, topic.value],
                          )
                        }
                      >
                        {topic.label}
                      </Chip>
                    );
                  })}
                </div>
              )}
            </fieldset>
          )}
        />
      </Card>

      <Button type="submit" variant="primary" disabled={isSubmitting || updateProfile.isPending}>
        {isSubmitting || updateProfile.isPending ? (
          <>
            <Spinner /> Saving…
          </>
        ) : (
          "Save profile"
        )}
      </Button>
    </form>
  );
}
