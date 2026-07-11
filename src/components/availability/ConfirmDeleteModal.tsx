"use client";

import { Button, Modal } from "@/components/ui";

export interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirming?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog for deleting a rule or exception. Salvaged from #32
 * (`feature/CTL-18-guide-availability`'s later revision) — CTL-55 Task 4 wires it in for both
 * availability rules and exceptions. Surfacing the delete error *inside* this dialog (rather than
 * as a page-level Alert) is a CTL-55 Task 5 carry-forward fix, not done here.
 */
export function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmLabel = "Remove",
  confirming,
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
