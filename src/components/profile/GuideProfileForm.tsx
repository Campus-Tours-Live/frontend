"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button, Chip, Field, Spinner, TextField, Textarea } from "@/components/ui";
import {
  ApiError,
  useTourTopics,
  useUpdateGuideProfile,
  type GuideProfile,
} from "@/lib/data-access";
import {
  UniversityMultiSelect,
  type UniversityOption,
} from "@/components/signup/UniversityMultiSelect";

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
  if (!profile.universityId) return [];
  return [{ id: profile.universityId, name: "Your university" }];
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
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    defaultValues: toFormValues(profile),
  });

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
      const message =
        err instanceof ApiError && err.status === 422
          ? "Check your inputs — name, university, and major are required."
          : "Could not save your profile. Please try again.";
      setError("root", { message });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {errors.root ? <Alert variant="error">{errors.root.message}</Alert> : null}
      {saveMessage ? <Alert variant="success">{saveMessage}</Alert> : null}

      <div className="space-y-5 rounded-panel border border-border bg-card p-6 shadow-card">
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

        <Field label="University" error={errors.university?.message}>
          <Controller
            control={control}
            name="university"
            rules={{
              validate: (value) => value.length > 0 || "University is required",
            }}
            render={({ field }) => (
              <UniversityMultiSelect value={field.value} onChange={field.onChange} max={1} />
            )}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Major"
            error={errors.major?.message}
            {...register("major", { required: "Major is required" })}
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
              <legend className="mb-2 block text-[13px] font-semibold text-ink">
                Languages you can guide in
              </legend>
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
              <legend className="mb-2 block text-[13px] font-semibold text-ink">
                Tour specialties <span className="font-normal text-ink-soft">(optional)</span>
              </legend>
              {topicsLoading ? (
                <p className="text-[14px] text-ink-soft">Loading…</p>
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
      </div>

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
