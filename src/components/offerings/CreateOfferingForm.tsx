"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { formSubmitErrorMessage } from "@/lib/errors";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Alert,
  Body,
  Button,
  Card,
  Chip,
  Icon,
  Link,
  Nudge,
  SectionHeading,
  SelectField,
  Spinner,
  TextField,
  Textarea,
} from "@/components/ui";
import { useCreateOffering, useLanguages, useTourFeatures, useTourTopics } from "@/lib/data-access";
import { UniversityField, type UniversityOption } from "@/components/signup/UniversityField";

const DURATIONS = [30, 45, 60, 90] as const;
const MAX_FEATURES = 3;

interface FormValues {
  title: string;
  university: UniversityOption[];
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
      university: [],
      topic: "",
      durationMin: "60",
      price: "42",
      description: "",
      languages: ["en-US"],
      features: [],
    },
  });

  const topic = useWatch({ control, name: "topic" });
  const featureOptions = topic ? (byTopic[topic] ?? []) : [];

  // Drop feature selections that are no longer valid for the chosen topic.
  useEffect(() => {
    if (!topic) {
      setValue("features", []);
      return;
    }
    const allowed = new Set((byTopic[topic] ?? []).map((o) => o.value));
    const next = getValues("features").filter((code) => allowed.has(code));
    setValue("features", next);
  }, [topic, byTopic, setValue, getValues]);

  const onSubmit = handleSubmit(async (values) => {
    const dollars = Number(values.price);
    if (Number.isNaN(dollars) || dollars < 20 || dollars > 200) {
      setError("price", { message: "Price must be between $20 and $200" });
      return;
    }

    const university = values.university[0];
    if (!university) {
      setError("university", { message: "University is required" });
      return;
    }

    if (values.languages.length === 0) {
      setError("languages", { message: "Select at least one language" });
      return;
    }

    try {
      await createOffering.mutateAsync({
        title: values.title.trim(),
        universityId: university.id,
        topic: values.topic,
        durationMin: Number(values.durationMin),
        priceCents: Math.round(dollars * 100),
        description: values.description.trim() || undefined,
        languages: values.languages,
        features: values.features.length ? values.features : undefined,
      });
      router.push("/guide/tour-offerings");
    } catch (err) {
      const message = formSubmitErrorMessage(err, {
        invalid: "Check your inputs — title, university, topic, duration, and price are required.",
        generic: "Could not save this offering. Please try again.",
      });
      setError("root", { message });
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

        <Controller
          control={control}
          name="university"
          rules={{
            validate: (value) => value.length > 0 || "University is required",
          }}
          render={({ field }) => (
            <UniversityField
              label="University"
              error={errors.university?.message}
              value={field.value}
              onChange={field.onChange}
              max={1}
            />
          )}
        />

        <SelectField
          label="Topic"
          error={errors.topic?.message}
          disabled={topicsLoading}
          {...register("topic", { required: "Topic is required" })}
        >
          <option value="">Select a topic</option>
          {topicOptions.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
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
                  {featureOptions.map((f) => {
                    const active = field.value.includes(f.value);
                    const atLimit = !active && field.value.length >= MAX_FEATURES;
                    return (
                      <Chip
                        key={f.value}
                        active={active}
                        disabled={atLimit}
                        onClick={() =>
                          field.onChange(
                            active
                              ? field.value.filter((v) => v !== f.value)
                              : [...field.value, f.value],
                          )
                        }
                      >
                        {f.label}
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
          rules={{
            validate: (value) => value.length > 0 || "Select at least one language",
          }}
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
                  {languageOptions.map((l) => {
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
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} minutes
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

      <Button type="submit" variant="primary" disabled={isSubmitting || createOffering.isPending}>
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
