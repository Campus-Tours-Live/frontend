"use client";

/** Shared onboarding cancel control with unsaved-changes confirmation. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Body, Button, Heading, Modal } from "@/components/ui";
import { useMe } from "@/lib/data-access";

export function OnboardingCancel({ dirty, disabled }: { dirty: boolean; disabled?: boolean }) {
  const router = useRouter();
  const { isOnboarded } = useMe();
  const [confirming, setConfirming] = useState(false);

  const target = isOnboarded ? "/dashboard" : "/signup/role";
  const leave = () => router.push(target);
  const onCancel = () => (dirty ? setConfirming(true) : leave());

  return (
    <>
      <Button
        variant="ghost"
        size="small"
        onClick={onCancel}
        disabled={disabled}
        className="shrink-0"
      >
        <X size={16} strokeWidth={2} />
        Cancel
      </Button>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        labelledBy="discard-onboarding-title"
        className="max-w-[400px]"
      >
        <div className="p-6">
          <Heading as="h2" size="h4" id="discard-onboarding-title">
            Discard your progress?
          </Heading>
          <Body size="medium" color="muted" className="mt-2">
            Your answers won&apos;t be saved.
          </Body>
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep editing
            </Button>
            <Button variant="primary" onClick={leave}>
              Discard
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
