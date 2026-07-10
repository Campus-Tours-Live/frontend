"use client";

import { Button, Modal } from "@/components/ui";

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirming?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

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
