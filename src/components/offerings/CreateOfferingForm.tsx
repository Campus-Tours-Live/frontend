"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Button,
  Field,
  Link,
  SectionHeading,
  SelectField,
  Spinner,
  TextField,
  Textarea,
} from "@/components/ui";
import { ApiError, useCreateOffering, useTourTopics } from "@/lib/data-access";
import {
  UniversityMultiSelect,
  type UniversityOption,
} from "@/components/signup/UniversityMultiSelect";

const DURATIONS = [30, 45, 60, 90] as const;

interface FormValues {
  title: string;
  university: UniversityOption[];
  topic: string;
  durationMin: string;
  price: string;
  description: string;
}

export function CreateOfferingForm() {
  const router = useRouter();
  const createOffering = useCreateOffering();
  const { data: topicOptions = [], isLoading: topicsLoading } = useTourTopics();

  const {
    register,
    control,
    handleSubmit,
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
    },
  });

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

    try {
      await createOffering.mutateAsync({
        title: values.title.trim(),
        universityId: university.id,
        topic: values.topic,
        durationMin: Number(values.durationMin),
        priceCents: Math.round(dollars * 100),
        description: values.description.trim() || undefined,
        languages: ["en-US"],
      });
      router.push("/guide/tour-offerings");
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 422
          ? "Check your inputs — title, university, topic, duration, and price are required."
          : "Could not save this offering. Please try again.";
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

      <div className="space-y-5 rounded-panel border border-border bg-card p-6 shadow-card">
        <TextField
          label="Public title"
          placeholder="Campus life and hidden study spots"
          error={errors.title?.message}
          {...register("title", { required: "Title is required" })}
        />

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
      </div>

      <div className="rounded-panel border border-border bg-canvas p-5 text-[13px] text-ink-soft">
        Saving creates a draft. Publishing requires a verified guide account and makes the offering
        visible on the public marketplace.
      </div>

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
