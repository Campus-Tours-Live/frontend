"use client";

import { useRouter } from "next/navigation";
import { formSubmitErrorMessage } from "@/lib/errors";
import { useForm } from "react-hook-form";
import {
  Alert,
  Button,
  Card,
  FormLabel,
  Icon,
  Link,
  Nudge,
  SectionHeading,
  SelectField,
  Skeleton,
  Spinner,
  TextField,
  Textarea,
} from "@/components/ui";
import { ApiError, useCreateOffering, useGuideProfile, useTourTopics } from "@/lib/data-access";

const DURATIONS = [30, 45, 60, 90] as const;

interface FormValues {
  title: string;
  topic: string;
  durationMin: string;
  price: string;
  description: string;
}

export function CreateOfferingForm() {
  const router = useRouter();
  const createOffering = useCreateOffering();
  const { data: topicOptions = [], isLoading: topicsLoading } = useTourTopics();
  const { data: guideProfile, isLoading: profileLoading } = useGuideProfile();
  const guideUniversity = guideProfile?.universities?.[0];
  const university = guideUniversity?.universityId
    ? { id: guideUniversity.universityId, name: guideUniversity.universityName ?? "Your campus" }
    : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      topic: "",
      durationMin: "60",
      price: "42",
      description: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!university) return;

    const dollars = Number(values.price);
    if (Number.isNaN(dollars) || dollars < 20 || dollars > 200) {
      setError("price", { message: "Price must be between $20 and $200" });
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
      const message = formSubmitErrorMessage(err, {
        invalid: "Check your inputs — title, topic, duration, and price are required.",
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

        <div>
          <FormLabel>University</FormLabel>
          {profileLoading ? (
            <Skeleton className="mt-2 h-11 w-full rounded-field" />
          ) : university ? (
            <div className="mt-2 flex items-center gap-2 rounded-field border border-border bg-canvas px-3 py-3">
              <Icon name="success" className="text-sage-foreground" />
              <span className="font-semibold text-ink">{university.name}</span>
              <span className="ml-auto text-ui-sm text-ink-soft">your verified campus</span>
            </div>
          ) : (
            <Alert variant="warning" className="mt-2">
              Finish guide onboarding (verify your school email) before creating an offering.
            </Alert>
          )}
        </div>

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
      </Card>

      <Nudge variant="info" leading={<Icon name="info" />} title="Saving creates a draft">
        Publishing requires a verified guide account and makes the offering visible on the public
        marketplace.
      </Nudge>

      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting || createOffering.isPending || profileLoading || !university}
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
