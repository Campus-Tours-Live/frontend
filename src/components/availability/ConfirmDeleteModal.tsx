"use client";

import { Alert, Button, Modal } from "@/components/ui";

export interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirming?: boolean;
  /**
   * A delete failure from the caller's mutation. CTL-55 Task 5 carry-forward fix (from #32's
   * later revision): this renders as an `Alert` INSIDE the dialog body — not a page-level banner
   * — so the guide sees the failure without the modal closing; the caller keeps the modal open
   * (`open` stays true) on failure and clears `error` when the delete finally succeeds or a new
   * delete is started.
   */
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog for deleting a rule or exception. Salvaged from #32
 * (`feature/CTL-18-guide-availability`'s later revision) — CTL-55 Task 4 wires it in for both
 * availability rules and exceptions.
 */
export function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmLabel = "Remove",
  confirming,
  error,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="confirm-delete-title"
      className="max-w-[400px]"
    >
      <div className="p-6">
        <h2 id="confirm-delete-title" className="font-display text-h4 text-ink">
          {title}
        </h2>
        <p className="mt-2 text-[14px] text-ink-soft">{description}</p>
        {error ? (
          <Alert variant="error" className="mt-4">
            {error}
          </Alert>
        ) : null}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={confirming}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm} disabled={confirming}>
            {confirming ? "Removing…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
