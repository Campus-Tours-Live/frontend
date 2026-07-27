"use client";

import { useState } from "react";
import { isAuthCancelled, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useMe, useParticipantProfile, useSetActiveRole, type Role } from "@/lib/data-access";
import { Alert, Button, SegmentedControl } from "@/components/ui";

/**
 * Role switcher, shown in the account menu. Three states by how
 * many self-acquirable roles you hold:
 *  - BOTH (participant + guide) → a segmented toggle [ Participant | Guide ]; tapping
 *    the inactive side switches the active context (setActiveRole; the shared
 *    /dashboard re-renders once ["me"]/["dashboard"] invalidate).
 *  - ONE → a "Become a {other}" button that starts that role's onboarding.
 *  - PARENT (can't become a guide) or a non-consumer/null context → nothing.
 */
export function RoleSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { me, hasRole } = useMe();
  const setActiveRole = useSetActiveRole();
  const [failed, setFailed] = useState<string | null>(null);

  const active = me?.activeRole;
  // Only fetch the participant profile when it could matter (deciding whether a participant
  // can become a guide, below) — called unconditionally per the rules of hooks; `enabled` does
  // the actual gating.
  const { data: participantProfile, isLoading: participantProfileLoading } = useParticipantProfile(
    active === "PARTICIPANT",
  );
  // Only a participant/guide context has a switcher (staff is excluded).
  if (active !== "PARTICIPANT" && active !== "GUIDE") return null;

  const pending = setActiveRole.isPending;

  async function switchTo(role: Role) {
    /* istanbul ignore next -- guard: the active role's control never triggers a switch */
    if (role === active) return;
    setFailed(null);
    try {
      await setActiveRole.mutateAsync(role);
      onNavigate?.();
    } catch (err) {
      // 403 (revoked mid-session) or network/5xx — surface a retry hint, don't fail silently.
      // A dismissed sign-in prompt is NOT the switch failing, so it must not read that way.
      setFailed(
        isAuthCancelled(err)
          ? SIGN_IN_AGAIN_MESSAGE
          : "Couldn't switch right now. Please try again.",
      );
    }
  }

  // --- Holds both roles → segmented toggle ---
  if (hasRole("PARTICIPANT") && hasRole("GUIDE")) {
    return (
      <div className="border-b border-border px-2.5 py-4">
        <SegmentedControl
          aria-label="Active role"
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

  // --- Holds one role → acquire the other (onboarding) ---
  const target: Role = active === "PARTICIPANT" ? "GUIDE" : "PARTICIPANT";
  // PARENT or guardian accounts can't become guides → hide the affordance. While the
  // participant profile is still loading we don't yet know, so hold off rather than flash
  // the button and then hide it once the PARENT status arrives.
  if (active === "PARTICIPANT" && target === "GUIDE") {
    if (participantProfileLoading) return null;
    if (participantProfile?.type === "PARENT") return null;
  }

  const targetLabel = target === "GUIDE" ? "Guide" : "Participant";
  const become = () => {
    onNavigate?.();
    router.push(target === "GUIDE" ? "/onboarding/guide" : "/onboarding/participant");
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
