"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { formSubmitErrorMessage } from "@/lib/errors";
import {
  Alert,
  Body,
  Button,
  Card,
  Chip,
  FormGroup,
  Icon,
  Link,
  Nudge,
  Radio,
  SectionHeading,
  SelectField,
  Skeleton,
  Spinner,
  TextField,
  Textarea,
} from "@/components/ui";
import {
  useCreateOffering,
  useGuideProfile,
  useLanguages,
  useTourFeatures,
  useTourTopics,
} from "@/lib/data-access";

const DURATIONS = [30, 45, 60, 90] as const;
const MAX_FEATURES = 3;
const UNVERIFIED_REASON = "Verify your school email to create tours for this campus.";

interface FormValues {
  title: string;
  universityId: string;
  topic: string;
  durationMin: string;
  price: string;
  description: string;
  languages: string[];
  features: string[];
}

export function CreateOfferingForm() {
  const router = useRouter();
  const createOffering = useCreateOffering();
  const { data: topicOptions = [], isLoading: topicsLoading } = useTourTopics();
  const { data: languageOptions = [], isLoading: languagesLoading } = useLanguages();
  const { byTopic, isLoading: featuresLoading } = useTourFeatures();
  const { data: guideProfile, isLoading: profileLoading } = useGuideProfile();
  const universities = guideProfile?.universities ?? [];
  const firstVerifiedId =
    universities.find((u) => u.verificationStatus === "VERIFIED" && u.universityId)?.universityId ??
    "";

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      universityId: "",
      topic: "",
      durationMin: "60",
      price: "42",
      description: "",
      languages: ["en-US"],
      features: [],
    },
  });

  const topic = useWatch({ control, name: "topic" });
  const selectedUniversityId = useWatch({ control, name: "universityId" });
  const featureOptions = topic ? (byTopic[topic] ?? []) : [];

  // Keep the guide on a verified university without overwriting a deliberate valid choice.
  useEffect(() => {
    if (firstVerifiedId) setValue("universityId", firstVerifiedId);
  }, [firstVerifiedId, setValue]);

  // Drop feature selections that do not belong to the currently selected topic.
  useEffect(() => {
    const allowed = new Set((topic ? (byTopic[topic] ?? []) : []).map((option) => option.value));
    const current = getValues("features");
    const next = topic ? current.filter((code) => allowed.has(code)) : [];
    if (next.length === current.length && next.every((code, index) => code === current[index]))
      return;
    setValue("features", next);
  }, [topic, byTopic, setValue, getValues]);

  const onSubmit = handleSubmit(async (values) => {
    if (!values.universityId) return;

    const dollars = Number(values.price);
    if (Number.isNaN(dollars) || dollars < 20 || dollars > 200) {
      setError("price", { message: "Price must be between $20 and $200" });
      return;
    }

    try {
      await createOffering.mutateAsync({
        title: values.title.trim(),
        universityId: values.universityId,
        topic: values.topic,
        durationMin: Number(values.durationMin),
        priceCents: Math.round(dollars * 100),
        description: values.description.trim() || undefined,
        languages: values.languages,
        features: values.features.length ? values.features : undefined,
      });
      router.push("/guide/tour-offerings");
    } catch (err) {
      setError("root", {
        message: formSubmitErrorMessage(err, {
          invalid: "Check your inputs — title, topic, duration, and price are required.",
          generic: "Could not save this offering. Please try again.",
        }),
      });
    }
  });

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Guide / Tour offerings"
          title="Create tour offering"
          lead="Save a draft now and publish when you're ready."
          level={1}
        />
        <Link href="/guide/tour-offerings" variant="ghost" size="small">
          Back to list
        </Link>
      </div>

      {errors.root ? <Alert variant="error">{errors.root.message}</Alert> : null}

      <Card padded={false} className="space-y-5 rounded-panel p-6">
        <TextField
          label="Public title"
          placeholder="Campus life and hidden study spots"
          error={errors.title?.message}
          {...register("title", { required: "Title is required" })}
        />

        <div>
          {profileLoading ? (
            <>
              <Body as="span" size="medium" weight={600} color="ink" className="mb-2 block">
                University
              </Body>
              <Skeleton className="h-11 w-full rounded-field" />
            </>
          ) : universities.length === 0 ? (
            <>
              <Body as="span" size="medium" weight={600} color="ink" className="mb-2 block">
                University
              </Body>
              <Alert variant="warning" className="mt-2">
                Finish guide onboarding (verify your school email) before creating an offering.
              </Alert>
            </>
          ) : (
            <FormGroup
              label="University"
              error={
                !firstVerifiedId
                  ? "None of your universities are verified yet. Verify your school email for at least one campus before you can create a tour offering."
                  : undefined
              }
            >
              {universities.map((university, index) => {
                const verified =
                  university.verificationStatus === "VERIFIED" && Boolean(university.universityId);
                const reasonId = `university-reason-${university.universityId || index}`;
                return (
                  <div
                    key={
                      university.universityId || `${university.universityName ?? "campus"}-${index}`
                    }
                  >
                    <Radio
                      name="universityId"
                      value={university.universityId ?? ""}
                      label={university.universityName ?? "Your campus"}
                      checked={verified && selectedUniversityId === university.universityId}
                      disabled={!verified}
                      aria-describedby={!verified ? reasonId : undefined}
                      onChange={() => {
                        if (verified) {
                          setValue("universityId", university.universityId as string, {
                            shouldValidate: true,
                          });
                        }
                      }}
                    />
                    {!verified ? (
                      <Body id={reasonId} size="small" color="muted" className="ml-7 mt-0.5">
                        {UNVERIFIED_REASON}
                      </Body>
                    ) : null}
                  </div>
                );
              })}
            </FormGroup>
          )}
        </div>

        <SelectField
          label="Topic"
          error={errors.topic?.message}
          disabled={topicsLoading}
          {...register("topic", { required: "Topic is required" })}
        >
          <option value="">Select a topic</option>
          {topicOptions.map((topicOption) => (
            <option key={topicOption.value} value={topicOption.value}>
              {topicOption.label}
            </option>
          ))}
        </SelectField>

        <Controller
          control={control}
          name="features"
          render={({ field }) => (
            <fieldset>
              <Body as="legend" size="small" weight={700} className="mb-2 block">
                Highlight features{" "}
                <span className="font-normal text-ink-soft">(up to {MAX_FEATURES})</span>
              </Body>
              {!topic ? (
                <Body size="medium" color="muted">
                  Choose a topic to see available features.
                </Body>
              ) : featuresLoading ? (
                <Body size="medium" color="muted">
                  Loading features…
                </Body>
              ) : featureOptions.length === 0 ? (
                <Body size="medium" color="muted">
                  No features for this topic.
                </Body>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {featureOptions.map((feature) => {
                    const active = field.value.includes(feature.value);
                    const atLimit = !active && field.value.length >= MAX_FEATURES;
                    return (
                      <Chip
                        key={feature.value}
                        active={active}
                        disabled={atLimit}
                        onClick={() =>
                          field.onChange(
                            active
                              ? field.value.filter((value) => value !== feature.value)
                              : [...field.value, feature.value],
                          )
                        }
                      >
                        {feature.label}
                      </Chip>
                    );
                  })}
                </div>
              )}
            </fieldset>
          )}
        />

        <Controller
          control={control}
          name="languages"
          rules={{ validate: (value) => value.length > 0 || "Select at least one language" }}
          render={({ field }) => (
            <fieldset>
              <Body as="legend" size="small" weight={700} className="mb-2 block">
                Languages for this tour
              </Body>
              {languagesLoading ? (
                <Body size="medium" color="muted">
                  Loading languages…
                </Body>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {languageOptions.map((language) => {
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
              )}
              {errors.languages?.message ? (
                <Body size="small" color="error" className="mt-2">
                  {errors.languages.message}
                </Body>
              ) : null}
            </fieldset>
          )}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField label="Duration" {...register("durationMin")}>
            {DURATIONS.map((duration) => (
              <option key={duration} value={duration}>
                {duration} minutes
              </option>
            ))}
          </SelectField>
          <TextField
            label="Price (USD)"
            type="number"
            min={20}
            max={200}
            step={1}
            error={errors.price?.message}
            {...register("price", { required: "Price is required" })}
          />
        </div>

        <Textarea
          label="Description"
          placeholder="What will participants see on this tour?"
          rows={4}
          {...register("description")}
        />
      </Card>

      <Nudge variant="info" leading={<Icon name="info" />} title="Saving creates a draft">
        Publishing requires a verified guide account and makes the offering visible on the public
        marketplace.
      </Nudge>

      <Button
        type="submit"
        variant="primary"
        disabled={
          isSubmitting || createOffering.isPending || profileLoading || !selectedUniversityId
        }
      >
        {isSubmitting || createOffering.isPending ? (
          <>
            <Spinner /> Saving draft…
          </>
        ) : (
          "Save draft"
        )}
      </Button>
    </form>
  );
}
