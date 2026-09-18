"use client";

import { useId, useState } from "react";
import { Body, Button, Heading, Modal, Textarea } from "@/components/ui";
import type { GuideBooking } from "@/lib/data-access";

export interface DeclineBookingModalProps {
  open: boolean;
  booking: GuideBooking | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function DeclineBookingModal({
  open,
  booking,
  pending,
  onClose,
  onConfirm,
}: DeclineBookingModalProps) {
  const titleId = useId();
  // Fresh reason each mount — parent remounts via `key` when the target booking changes.
  const [reason, setReason] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className="w-full max-w-md"
      header={
        <Heading as="h2" id={titleId} size="small">
          Decline booking?
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
            {pending ? "Declining…" : "Decline"}
          </Button>
        </div>
      }
    >
      <Body size="small" className="mb-3">
        {booking
          ? `Decline ${booking.offeringTitle} with ${booking.participantName}? You can leave an optional reason.`
          : "Decline this booking request?"}
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
