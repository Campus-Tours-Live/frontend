"use client";

import { useId, useState } from "react";
import { Body, Button, Heading, Modal, Textarea } from "@/components/ui";
import type { GuideBooking } from "@/lib/data-access";

export interface CancelBookingModalProps {
  open: boolean;
  booking: GuideBooking | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function CancelBookingModal({
  open,
  booking,
  pending,
  onClose,
  onConfirm,
}: CancelBookingModalProps) {
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
          Cancel booking?
        </Heading>
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            Keep booking
          </Button>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => void onConfirm(reason.trim())}
          >
            {pending ? "Cancelling…" : "Cancel booking"}
          </Button>
        </div>
      }
    >
      <Body size="small" className="mb-3">
        {booking
          ? `Cancel ${booking.offeringTitle} with ${booking.participantName}? You can leave an optional reason.`
          : "Cancel this confirmed booking?"}
      </Body>
      <Textarea
        label="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={1000}
      />
    </Modal>
  );
}
