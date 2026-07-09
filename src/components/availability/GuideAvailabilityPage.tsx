"use client";

import { useState } from "react";
import { Alert, SectionHeading, Spinner } from "@/components/ui";
import {
  useCreateAvailabilityException,
  useCreateAvailabilityRule,
  useDeleteAvailabilityException,
  useDeleteAvailabilityRule,
  useGuideAvailability,
  useUpdateAvailabilityException,
  useUpdateAvailabilityRule,
  ApiError,
  apiErrorMessage,
  type AvailabilityException,
  type AvailabilityRule,
} from "@/lib/data-access";
import { BookingRulesPanel } from "./BookingRulesPanel";
import { DateSpecificHoursPanel } from "./DateSpecificHoursPanel";
import { DAY_LABELS, formatTimeRange } from "./availabilityHelpers";
import {
  ExceptionFormModal,
  exceptionFormErrorMessage,
  type ExceptionFormValues,
} from "./ExceptionFormModal";
import { RuleFormModal, ruleFormErrorMessage, type RuleFormValues } from "./RuleFormModal";
import { WeeklySchedulePanel } from "./WeeklySchedulePanel";

export function GuideAvailabilityPage() {
  const { data, isLoading, isError, error: loadError } = useGuideAvailability();
  const createRule = useCreateAvailabilityRule();
  const updateRule = useUpdateAvailabilityRule();
  const deleteRule = useDeleteAvailabilityRule();
  const createException = useCreateAvailabilityException();
  const updateException = useUpdateAvailabilityException();
  const deleteException = useDeleteAvailabilityException();

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AvailabilityRule | null>(null);
  const [defaultDayOfWeek, setDefaultDayOfWeek] = useState<number | undefined>();
  const [ruleError, setRuleError] = useState<string | null>(null);

  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [editingException, setEditingException] = useState<AvailabilityException | null>(null);
  const [exceptionError, setExceptionError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const timezone = data?.bookingSettings.timezone ?? "America/Los_Angeles";

  function actionErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof ApiError) {
      return apiErrorMessage(err) ?? fallback;
    }
    return fallback;
  }

  const openCreateRule = (dayOfWeek?: number) => {
    setEditingRule(null);
    setDefaultDayOfWeek(dayOfWeek);
    setRuleError(null);
    setRuleModalOpen(true);
  };

  const openEditRule = (rule: AvailabilityRule) => {
    setEditingRule(rule);
    setDefaultDayOfWeek(undefined);
    setRuleError(null);
    setRuleModalOpen(true);
  };

  const openCreateException = () => {
    setEditingException(null);
    setExceptionError(null);
    setExceptionModalOpen(true);
  };

  const openEditException = (exception: AvailabilityException) => {
    setEditingException(exception);
    setExceptionError(null);
    setExceptionModalOpen(true);
  };

  const handleRuleSubmit = async (values: RuleFormValues) => {
    setRuleError(null);
    const body = {
      dayOfWeek: Number(values.dayOfWeek),
      startLocal: values.startLocal,
      endLocal: values.endLocal,
      timezone: values.timezone.trim() || timezone,
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo.trim() || null,
      active: true,
    };

    try {
      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, body });
      } else {
        await createRule.mutateAsync(body);
      }
    } catch (err) {
      setRuleError(ruleFormErrorMessage(err));
      throw err;
    }
  };

  const handleExceptionSubmit = async (values: ExceptionFormValues) => {
    setExceptionError(null);
    const body = {
      exceptionDate: values.exceptionDate,
      type: values.type,
      startLocal: values.type === "UNAVAILABLE_ALL_DAY" ? undefined : values.startLocal,
      endLocal: values.type === "UNAVAILABLE_ALL_DAY" ? undefined : values.endLocal,
      reason: values.reason.trim() || undefined,
    };

    try {
      if (editingException) {
        await updateException.mutateAsync({ id: editingException.id, body });
      } else {
        await createException.mutateAsync(body);
      }
    } catch (err) {
      setExceptionError(exceptionFormErrorMessage(err));
      throw err;
    }
  };

  const handleDeleteRule = async (rule: AvailabilityRule) => {
    if (
      !window.confirm(
        `Remove ${DAY_LABELS[rule.dayOfWeek]} ${formatTimeRange(rule.startLocal, rule.endLocal)}?`,
      )
    ) {
      return;
    }
    setDeleteError(null);
    try {
      await deleteRule.mutateAsync(rule.id);
    } catch (err) {
      setDeleteError(
        actionErrorMessage(err, "Could not remove recurring hours. Please try again."),
      );
    }
  };

  const handleDeleteException = async (exception: AvailabilityException) => {
    if (!window.confirm(`Remove date-specific hours on ${exception.exceptionDate}?`)) {
      return;
    }
    setDeleteError(null);
    try {
      await deleteException.mutateAsync(exception.id);
    } catch (err) {
      setDeleteError(
        actionErrorMessage(err, "Could not remove date-specific hours. Please try again."),
      );
    }
  };

  return (
    <div className="mx-auto max-w-[960px] space-y-8">
      <SectionHeading
        eyebrow="Guide"
        title="Schedules"
        lead="Manage when participants can book you — weekly hours, date overrides, and booking limits."
        level={1}
      />

      {deleteError ? <Alert variant="error">{deleteError}</Alert> : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink-soft">
          <Spinner />
          Loading availability…
        </div>
      ) : null}

      {isError ? (
        <Alert variant="error">
          {actionErrorMessage(loadError, "Failed to load your availability.")}
        </Alert>
      ) : null}

      {data ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div className="space-y-6">
            <WeeklySchedulePanel
              rules={data.rules}
              timezone={timezone}
              onAddDay={openCreateRule}
              onEditRule={openEditRule}
              onRemoveRule={handleDeleteRule}
              removingRuleId={deleteRule.isPending ? deleteRule.variables : null}
            />

            <DateSpecificHoursPanel
              exceptions={data.exceptions}
              onAdd={openCreateException}
              onEdit={openEditException}
              onRemove={handleDeleteException}
              removingId={deleteException.isPending ? deleteException.variables : null}
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <BookingRulesPanel settings={data.bookingSettings} />
            <p className="rounded-panel border border-border bg-canvas px-4 py-3 text-[13px] text-ink-soft">
              Open slots combine weekly hours, date-specific overrides, existing bookings, buffers,
              and your notice window.
            </p>
          </aside>
        </div>
      ) : null}

      <RuleFormModal
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        timezone={timezone}
        initial={editingRule}
        defaultDayOfWeek={defaultDayOfWeek}
        onSubmit={handleRuleSubmit}
        submitting={createRule.isPending || updateRule.isPending}
        error={ruleError}
      />

      <ExceptionFormModal
        open={exceptionModalOpen}
        onClose={() => setExceptionModalOpen(false)}
        timezone={timezone}
        initial={editingException}
        onSubmit={handleExceptionSubmit}
        submitting={createException.isPending || updateException.isPending}
        error={exceptionError}
      />
    </div>
  );
}
