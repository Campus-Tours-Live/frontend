"use client";

import { useState } from "react";
import { isAuthCancelled, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";
import { UserPlus } from "lucide-react";
import { useMe, useParticipantProfile, useSetCurrentRole, type Role } from "@/lib/data-access";
import { Alert, Button, SegmentedControl } from "@/components/ui";

/** Switches active participant/guide roles or starts onboarding for another role. */
export function RoleSwitcher({
  onNavigate,
  navigate = (url: string) => window.location.assign(url),
}: {
  onNavigate?: () => void;
  
  navigate?: (url: string) => void;
}) {
  const { me, hasRole } = useMe();
  const setCurrentRole = useSetCurrentRole();
  const [failed, setFailed] = useState<string | null>(null);

  const active = me?.currentRole;
  const { data: participantProfile, isLoading: participantProfileLoading } = useParticipantProfile(
    active === "PARTICIPANT",
  );
  if (active !== "PARTICIPANT" && active !== "GUIDE") return null;

  const pending = setCurrentRole.isPending;

  async function switchTo(role: Role) {
    /* istanbul ignore next -- guard: the current role's control never triggers a switch */
    if (role === active) return;
    setFailed(null);
    try {
      await setCurrentRole.mutateAsync(role);
      onNavigate?.();
    } catch (err) {
      setFailed(
        isAuthCancelled(err)
          ? SIGN_IN_AGAIN_MESSAGE
          : "Couldn't switch right now. Please try again.",
      );
    }
  }

  if (hasRole("PARTICIPANT") && hasRole("GUIDE")) {
    return (
      <div className="border-b border-border px-2.5 py-4">
        <SegmentedControl
          aria-label="Current role"
          size="small"
          value={active}
          disabled={pending}
          onChange={switchTo}
          options={[
            { value: "PARTICIPANT", label: "Participant" },
            { value: "GUIDE", label: "Guide" },
          ]}
        />
        {failed && (
          <Alert variant="error" className="mt-2.5 text-ui-sm">
            {failed}
          </Alert>
        )}
      </div>
    );
  }

  const target: Role = active === "PARTICIPANT" ? "GUIDE" : "PARTICIPANT";
  if (active === "PARTICIPANT" && target === "GUIDE") {
    if (participantProfileLoading) return null;
    if (participantProfile?.type === "PARENT") return null;
  }

  const targetLabel = target === "GUIDE" ? "Guide" : "Participant";

  const become = () => {
    onNavigate?.();
    navigate(target === "GUIDE" ? "/onboarding/guide" : "/onboarding/participant");
  };

  return (
    <div className="border-b border-border px-2.5 py-4">
      <Button variant="secondary" block onClick={become}>
        <UserPlus size={16} strokeWidth={1.8} />
        Become a {targetLabel}
      </Button>
    </div>
  );
}
