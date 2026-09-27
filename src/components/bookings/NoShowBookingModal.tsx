"use client";

import { useId, useState } from "react";
import { Body, Button, Heading, Modal, Textarea } from "@/components/ui";
import type { GuideBooking } from "@/lib/data-access";

export interface NoShowBookingModalProps {
  open: boolean;
  booking: GuideBooking | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function NoShowBookingModal({
  open,
  booking,
  pending,
  onClose,
  onConfirm,
}: NoShowBookingModalProps) {
  const titleId = useId();
  const [reason, setReason] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className="w-full max-w-md"
      header={
        <Heading as="h2" id={titleId} size="small">
          Mark participant no-show?
        </Heading>
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => void onConfirm(reason.trim())}
          >
            {pending ? "Saving…" : "Mark no-show"}
          </Button>
        </div>
      }
    >
      <Body size="small" className="mb-3">
        {booking
          ? `Mark ${booking.participantName} as a no-show for ${booking.offeringTitle}? You can leave an optional note.`
          : "Mark this participant as a no-show?"}
      </Body>
      <Textarea
        label="Note (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={1000}
      />
    </Modal>
  );
}
