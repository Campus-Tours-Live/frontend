"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { formSubmitErrorMessage } from "@/lib/errors";
import { useForm } from "react-hook-form";
import {
  Alert,
  Body,
  Button,
  Card,
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
  useTourTopics,
  useUpdateOffering,
  type Offering,
} from "@/lib/data-access";

const DURATIONS = [30, 45, 60, 90] as const;

const UNVERIFIED_REASON = "Verify your school email to create tours for this campus.";

interface FormValues {
  title: string;
  universityId: string;
  topic: string;
  durationMin: string;
  price: string;
  description: string;
}

export function CreateOfferingForm({ offering }: { offering?: Offering }) {
  const router = useRouter();
  const createOffering = useCreateOffering();
  const updateOffering = useUpdateOffering();
  const isEditing = Boolean(offering);
  const { data: topicOptions = [], isLoading: topicsLoading } = useTourTopics();
  const { data: guideProfile, isLoading: profileLoading } = useGuideProfile();
  const universities = guideProfile?.universities ?? [];
  const firstVerifiedId =
    universities.find((u) => u.verificationStatus === "VERIFIED" && u.universityId)?.universityId ??
    "";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      title: offering?.title ?? "",
      universityId: offering?.universityId ?? "",
      topic: offering?.topic ?? "",
      durationMin: String(offering?.durationMin ?? 60),
      price: String((offering?.priceCents ?? 4200) / 100),
      description: offering?.description ?? "",
    },
  });

  const selectedUniversityId = watch("universityId");

  // Default-select the guide's first VERIFIED university once the profile loads. Runs again only
  // if the resolved default itself changes (e.g. profile refetches with a different verified
  // school first) — it never clobbers a selection the guide already made among several verified
  // campuses.
  useEffect(() => {
    if (firstVerifiedId && !selectedUniversityId) {
      setValue("universityId", firstVerifiedId);
    }
  }, [firstVerifiedId, selectedUniversityId, setValue]);

  useEffect(() => {
    if (!offering) return;
    reset({
      title: offering.title,
      universityId: offering.universityId ?? "",
      topic: offering.topic ?? "",
      durationMin: String(offering.durationMin),
      price: String(offering.priceCents / 100),
      description: offering.description ?? "",
    });
  }, [offering, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!values.universityId) return;

    const dollars = Number(values.price);
    if (Number.isNaN(dollars) || dollars < 20 || dollars > 200) {
      setError("price", { message: "Price must be between $20 and $200" });
      return;
    }

    try {
      const body = {
        title: values.title.trim(),
        universityId: values.universityId,
        topic: values.topic,
        durationMin: Number(values.durationMin),
        priceCents: Math.round(dollars * 100),
        description: values.description.trim() || undefined,
        languages: ["en-US"],
      };
      if (offering) {
        await updateOffering.mutateAsync({ offeringId: offering.id, body });
      } else {
        await createOffering.mutateAsync(body);
      }
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
          title={isEditing ? "Edit tour offering" : "Create tour offering"}
          lead={
            isEditing
              ? "Update this paused or draft offering, then publish it when you're ready."
              : "Save a draft now and publish when you're ready."
          }
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
              {universities.map((uni, index) => {
                const verified = uni.verificationStatus === "VERIFIED" && Boolean(uni.universityId);
                const reasonId = `university-reason-${uni.universityId || index}`;
                return (
                  <div key={uni.universityId || `${uni.universityName ?? "campus"}-${index}`}>
                    <Radio
                      name="universityId"
                      value={uni.universityId ?? ""}
                      label={uni.universityName ?? "Your campus"}
                      checked={verified && selectedUniversityId === uni.universityId}
                      disabled={!verified}
                      aria-describedby={!verified ? reasonId : undefined}
                      // Defence-in-depth: the radio is also `disabled` for a non-VERIFIED entry, but
                      // guard here too rather than assume the browser always blocks the interaction.
                      onChange={() => {
                        if (verified) {
                          setValue("universityId", uni.universityId as string, {
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

      <Nudge
        variant="info"
        leading={<Icon name="info" />}
        title={isEditing ? "Edit safely" : "Saving creates a draft"}
      >
        {isEditing
          ? "Paused and draft offerings can be edited. Publish when the details are ready for participants."
          : "Publishing requires a verified guide account and makes the offering visible on the public marketplace."}
      </Nudge>

      <Button
        type="submit"
        variant="primary"
        disabled={
          isSubmitting ||
          createOffering.isPending ||
          updateOffering.isPending ||
          profileLoading ||
          !selectedUniversityId
        }
      >
        {isSubmitting || createOffering.isPending || updateOffering.isPending ? (
          <>
            <Spinner /> Saving draft…
          </>
        ) : isEditing ? (
          "Save changes"
        ) : (
          "Save draft"
        )}
      </Button>
    </form>
  );
}
