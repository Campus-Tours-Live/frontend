"use client";

import { useState } from "react";
import { Alert, SectionHeading, Spinner } from "@/components/ui";
import {
  useAvailabilityExceptions,
  useAvailabilityRules,
  useAvailabilitySettings,
  useCreateAvailabilityException,
  useCreateAvailabilityRule,
  useDeleteAvailabilityException,
  useDeleteAvailabilityRule,
  useResolvedAvailability,
  useUpdateAvailabilityException,
  useUpdateAvailabilityRule,
  type AvailabilityException,
  type AvailabilityRule,
} from "@/lib/data-access";
import { formatWindow } from "@/lib/availability/duration";
import { BookingRulesPanel } from "./BookingRulesPanel";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { DateSpecificHoursPanel } from "./DateSpecificHoursPanel";
import { DAY_LABELS } from "./availabilityHelpers";
import {
  ExceptionFormModal,
  exceptionFormErrorMessage,
  type ExceptionFormValues,
} from "./ExceptionFormModal";
import { ResolvedAvailabilityPreview } from "./ResolvedAvailabilityPreview";
import { RuleFormModal, ruleFormErrorMessage, type RuleFormValues } from "./RuleFormModal";
import { WeeklySchedulePanel } from "./WeeklySchedulePanel";

const FALLBACK_TIMEZONE = "America/Los_Angeles";

type PendingDelete =
  | { kind: "rule"; rule: AvailabilityRule }
  | { kind: "exception"; exception: AvailabilityException }
  | null;

/**
 * Guide availability workspace — assembles the T1 data-access hooks, the T2/T3 rule/exception
 * modals, and the Task-4 panels/preview into one page.
 *
 * Locked data model (CTL-55 Task 4): `WeeklySchedulePanel`/`DateSpecificHoursPanel` render one
 * editable bar PER RULE/EXCEPTION — never coalesced client-side. The "actual availability" preview
 * (`ResolvedAvailabilityPreview`) renders the backend-resolved read (`useResolvedAvailability`)
 * exactly as returned, including the DST gap-day notice — this page never re-coalesces occurrences.
 */
export function GuideAvailabilityPage() {
  const rulesQuery = useAvailabilityRules();
  const exceptionsQuery = useAvailabilityExceptions();
  const settingsQuery = useAvailabilitySettings();
  const resolvedQuery = useResolvedAvailability();

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
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const settingsTimezone = settingsQuery.data?.timezone ?? FALLBACK_TIMEZONE;

  const isLoading =
    rulesQuery.isLoading ||
    exceptionsQuery.isLoading ||
    settingsQuery.isLoading ||
    resolvedQuery.isLoading;
  const isError =
    rulesQuery.isError || exceptionsQuery.isError || settingsQuery.isError || resolvedQuery.isError;

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
    try {
      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, body: values });
      } else {
        await createRule.mutateAsync(values);
      }
    } catch (err) {
      setRuleError(ruleFormErrorMessage(err));
      throw err;
    }
  };

  const handleExceptionSubmit = async (values: ExceptionFormValues) => {
    setExceptionError(null);
    try {
      if (editingException) {
        await updateException.mutateAsync({ id: editingException.id, body: values });
      } else {
        await createException.mutateAsync(values);
      }
    } catch (err) {
      setExceptionError(exceptionFormErrorMessage(err));
      throw err;
    }
  };

  const handleRemoveRule = (rule: AvailabilityRule) => {
    setDeleteError(null);
    setPendingDelete({ kind: "rule", rule });
  };

  const handleRemoveException = (exception: AvailabilityException) => {
    setDeleteError(null);
    setPendingDelete({ kind: "exception", exception });
  };

  /**
   * On success, closes the modal (`setPendingDelete(null)`). On failure, `pendingDelete` is left
   * set — the modal stays open — and `deleteError` is passed into `ConfirmDeleteModal`'s `error`
   * prop so the guide sees the failure INSIDE the dialog (CTL-55 Task 5 carry-forward fix from
   * #32; previously this rendered as a page-level `Alert` instead).
   */
  const confirmPendingDelete = async () => {
    if (!pendingDelete) return;

    setDeleteError(null);
    try {
      if (pendingDelete.kind === "rule") {
        await deleteRule.mutateAsync(pendingDelete.rule.id);
      } else {
        await deleteException.mutateAsync(pendingDelete.exception.id);
      }
      setPendingDelete(null);
    } catch {
      setDeleteError(
        pendingDelete.kind === "rule"
          ? "Could not remove recurring hours. Please try again."
          : "Could not remove date-specific hours. Please try again.",
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

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink-soft">
          <Spinner />
          Loading availability…
        </div>
      ) : null}

      {isError ? <Alert variant="error">Failed to load your availability.</Alert> : null}

      {!isLoading && !isError ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div className="space-y-6">
            <WeeklySchedulePanel
              rules={rulesQuery.data ?? []}
              onAddDay={openCreateRule}
              onEditRule={openEditRule}
              onRemoveRule={handleRemoveRule}
              removingRuleId={deleteRule.isPending ? deleteRule.variables : null}
            />

            <DateSpecificHoursPanel
              exceptions={exceptionsQuery.data ?? []}
              onAdd={openCreateException}
              onEdit={openEditException}
              onRemove={handleRemoveException}
              removingId={deleteException.isPending ? deleteException.variables : null}
            />

            <ResolvedAvailabilityPreview
              resolved={resolvedQuery.data}
              timezone={settingsTimezone}
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6">
            {settingsQuery.data ? <BookingRulesPanel settings={settingsQuery.data} /> : null}
          </aside>
        </div>
      ) : null}

      <RuleFormModal
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        initial={editingRule}
        defaultDayOfWeek={defaultDayOfWeek}
        settingsTimezone={settingsTimezone}
        onSubmit={handleRuleSubmit}
        submitting={createRule.isPending || updateRule.isPending}
        error={ruleError}
      />

      <ExceptionFormModal
        open={exceptionModalOpen}
        onClose={() => setExceptionModalOpen(false)}
        initial={editingException}
        onSubmit={handleExceptionSubmit}
        submitting={createException.isPending || updateException.isPending}
        error={exceptionError}
      />

      <ConfirmDeleteModal
        open={pendingDelete != null}
        title={
          pendingDelete?.kind === "rule" ? "Remove recurring hours?" : "Remove date-specific hours?"
        }
        description={
          pendingDelete?.kind === "rule"
            ? `This removes ${DAY_LABELS[pendingDelete.rule.dayOfWeek]} ${formatWindow(
                pendingDelete.rule.startLocal,
                pendingDelete.rule.windowMin,
              )} from your weekly schedule.`
            : pendingDelete?.kind === "exception"
              ? `This removes the override on ${pendingDelete.exception.exceptionDate}.`
              : ""
        }
        confirming={deleteRule.isPending || deleteException.isPending}
        error={deleteError}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmPendingDelete()}
      />
    </div>
  );
}
