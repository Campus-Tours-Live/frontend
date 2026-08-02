"use client";

import { useState } from "react";
import { isAuthCancelled, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";
import { UserPlus } from "lucide-react";
import { useMe, useParticipantProfile, useSetCurrentRole, type Role } from "@/lib/data-access";
import { Alert, Button, SegmentedControl } from "@/components/ui";

/**
 * Role switcher, shown in the account menu. Three states by how
 * many self-acquirable roles you hold:
 *  - BOTH (participant + guide) → a segmented toggle [ Participant | Guide ]; tapping
 *    the inactive side switches the active context (setCurrentRole; the shared
 *    /dashboard re-renders once ["me"] is patched and ["dashboard"] invalidates).
 *  - ONE → a "Become a {other}" button that navigates straight to that role's onboarding
 *    route IN-APP (never `/auth/login?role=…`). This is always a logged-in context —
 *    round-tripping through the bff's OAuth entry would re-run Google sign-in and force an
 *    account re-selection for a user who is already authenticated, which is wrong here (that
 *    redirect is still correct for the genuinely-unauthenticated entries in `AuthOptions`).
 *    There's no session call to make first: the onboarding page itself (its RSC guard) owns
 *    eligibility — e.g. it bounces a PARENT away from `/onboarding/guide` — so this button can
 *    navigate blindly and let the destination enforce the rule.
 *  - PARENT (can't become a guide) or a non-consumer/null context → nothing.
 */
export function RoleSwitcher({
  onNavigate,
  navigate = (url: string) => window.location.assign(url),
}: {
  onNavigate?: () => void;
  /** Override navigation in tests without replacing jsdom's window.location. */
  navigate?: (url: string) => void;
}) {
  const { me, hasRole } = useMe();
  const setCurrentRole = useSetCurrentRole();
  const [failed, setFailed] = useState<string | null>(null);

  const active = me?.currentRole;
  // Only fetch the participant profile when it could matter (deciding whether a participant
  // can become a guide, below) — called unconditionally per the rules of hooks; `enabled` does
  // the actual gating.
  const { data: participantProfile, isLoading: participantProfileLoading } = useParticipantProfile(
    active === "PARTICIPANT",
  );
  // Only a participant/guide context has a switcher (staff is excluded).
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
