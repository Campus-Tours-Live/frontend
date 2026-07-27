"use client";

import { useState } from "react";
import { isAuthCancelled, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";
import { UserPlus } from "lucide-react";
import {
  ApiError,
  useMe,
  useParticipantProfile,
  useSetActiveRole,
  useSetOnboardingRole,
  type Role,
} from "@/lib/data-access";
import { Alert, Button, SegmentedControl } from "@/components/ui";

/**
 * Role switcher, shown in the account menu. Three states by how
 * many self-acquirable roles you hold:
 *  - BOTH (participant + guide) → a segmented toggle [ Participant | Guide ]; tapping
 *    the inactive side switches the active context (setActiveRole; the shared
 *    /dashboard re-renders once ["me"] is patched and ["dashboard"] invalidates).
 *  - ONE → a "Become a {other}" button that starts that role's onboarding IN-APP, via
 *    `POST /v1/session/onboarding-role` (never `/auth/login?role=…`). This is always a
 *    logged-in context — round-tripping through the bff's OAuth entry would re-run Google
 *    sign-in and force an account re-selection for a user who is already authenticated, which
 *    is wrong here (that redirect is still correct for the genuinely-unauthenticated entries in
 *    `AuthOptions`). On 200 the bff sets `session.onboardingRole` (gating `/onboarding/*` — see
 *    auth/routes.ts) and this navigates there; 403 means not eligible (e.g. PARENT → GUIDE) and
 *    surfaces a message with no navigation; 409 (already held — shouldn't happen on this path)
 *    defensively falls back to switching instead of onboarding.
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
  const setActiveRole = useSetActiveRole();
  const setOnboardingRole = useSetOnboardingRole();
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
  const becomePending = setOnboardingRole.isPending || setActiveRole.isPending;

  const become = async () => {
    setFailed(null);
    try {
      await setOnboardingRole.mutateAsync(target);
      onNavigate?.();
      navigate(target === "GUIDE" ? "/onboarding/guide" : "/onboarding/participant");
    } catch (err) {
      // A dismissed sign-in prompt is NOT the onboarding call failing — check it first, before
      // any status-code branch (it isn't an HTTP failure at all).
      if (isAuthCancelled(err)) {
        setFailed(SIGN_IN_AGAIN_MESSAGE);
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        // Already held — shouldn't happen on the become path, but if it does, switch rather
        // than onboard (mirrors switchTo, since the segmented-toggle branch isn't reachable
        // from here — this account only holds one role).
        try {
          await setActiveRole.mutateAsync(target);
          onNavigate?.();
          navigate("/dashboard");
        } catch (switchErr) {
          setFailed(
            isAuthCancelled(switchErr)
              ? SIGN_IN_AGAIN_MESSAGE
              : "Couldn't switch right now. Please try again.",
          );
        }
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        // Not eligible (e.g. PARENT → GUIDE). The button is already hidden for that case above
        // — this only fires if eligibility changed server-side mid-session.
        setFailed(
          target === "GUIDE"
            ? "Parent or guardian accounts can't become guides."
            : `You're not eligible to become a ${targetLabel} right now.`,
        );
        return;
      }
      setFailed("Couldn't start onboarding right now. Please try again.");
    }
  };

  return (
    <div className="border-b border-border px-2.5 py-4">
      <Button variant="secondary" block onClick={become} disabled={becomePending}>
        <UserPlus size={16} strokeWidth={1.8} />
        Become a {targetLabel}
      </Button>
      {failed && (
        <Alert variant="error" className="mt-2.5 text-ui-sm">
          {failed}
        </Alert>
      )}
    </div>
  );
}
