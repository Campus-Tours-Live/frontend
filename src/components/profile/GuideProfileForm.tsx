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
  useMajors,
  useTourTopics,
  useUpdateGuideProfile,
  type GuideProfile,
} from "@/lib/data-access";
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
  classYear: string;
  bio: string;
  languages: string[];
  specialties: string[];
  basePrice: string;
}

export interface GuideProfileFormProps {
  profile: GuideProfile;
}

function universitySeed(profile: GuideProfile): UniversityOption[] {
  if (!profile.universityId || !profile.universityName) return [];
  return [
    {
      id: profile.universityId,
      name: profile.universityName,
      shortName: profile.universityShortName ?? null,
    },
  ];
}

function toFormValues(profile: GuideProfile): FormValues {
  const basePriceCents = profile.basePriceCents ?? 2800;
  return {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    university: universitySeed(profile),
    major: profile.major ?? "",
    classYear: profile.classYear ?? "",
    bio: profile.bio ?? "",
    languages: profile.languages?.length ? profile.languages : ["en-US"],
    specialties: profile.specialties ?? [],
    basePrice: String(Math.round(basePriceCents / 100)),
  };
}

export function GuideProfileForm({ profile }: GuideProfileFormProps) {
  const updateProfile = useUpdateGuideProfile();
  const { data: topicOptions = [], isLoading: topicsLoading } = useTourTopics();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    defaultValues: toFormValues(profile),
  });

  // Majors are the fields of study the SELECTED school actually offers (live). Empty until a school
  // is picked, and empty for a pre-existing local university (whose id isn't a Scorecard id) — the
  // saved major is preserved as a fallback option so editing other fields never loses it.
  const selectedUniversity = watch("university")?.[0];
  const { data: majorOptions = [] } = useMajors(selectedUniversity?.id);

  useEffect(() => {
    reset(toFormValues(profile));
  }, [profile, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaveMessage(null);

    const dollars = Number(values.basePrice);
    if (Number.isNaN(dollars) || dollars < 20 || dollars > 200) {
      setError("basePrice", { message: "Price must be between $20 and $200" });
      return;
    }

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
        classYear: values.classYear.trim() || undefined,
        bio: values.bio.trim() || undefined,
        languages: values.languages,
        specialties: values.specialties,
        basePriceCents: Math.round(dollars * 100),
      });
      setSaveMessage("Profile saved.");
    } catch (err) {
      const message = formSubmitErrorMessage(err, {
        invalid: "Check your inputs — name, university, and major are required.",
        generic: "Could not save your profile. Please try again.",
      });
      setError("root", { message });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-8">
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
          <TextField label="Class year" optional {...register("classYear")} />
        </div>

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

        <TextField
          label="Base price per tour (USD)"
          type="number"
          min={20}
          max={200}
          step={1}
          fieldClassName="max-w-[220px]"
          error={errors.basePrice?.message}
          hint="Default pricing for new tour offerings."
          {...register("basePrice", { required: "Price is required" })}
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
