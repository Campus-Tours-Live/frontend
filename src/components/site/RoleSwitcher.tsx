"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useMe, useSetActiveRole, type Role } from "@/lib/data-access";
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
  const [failed, setFailed] = useState(false);

  const active = me?.activeRole;
  // Only a participant/guide context has a switcher (staff is excluded).
  if (active !== "PARTICIPANT" && active !== "GUIDE") return null;

  const pending = setActiveRole.isPending;

  async function switchTo(role: Role) {
    /* istanbul ignore next -- guard: the active role's control never triggers a switch */
    if (role === active) return;
    setFailed(false);
    try {
      await setActiveRole.mutateAsync(role);
      onNavigate?.();
    } catch {
      // 403 (revoked mid-session) or network/5xx — surface a retry hint, don't fail silently.
      setFailed(true);
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
          <Alert variant="error" className="mt-2.5 text-[13px]">
            Couldn&apos;t switch right now. Please try again.
          </Alert>
        )}
      </div>
    );
  }

  // --- Holds one role → acquire the other (onboarding) ---
  const target: Role = active === "PARTICIPANT" ? "GUIDE" : "PARTICIPANT";
  // PARENT or guardian accounts can't become guides → hide the affordance.
  if (active === "PARTICIPANT" && target === "GUIDE" && me?.participantType === "PARENT") {
    return null;
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
