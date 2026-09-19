"use client";

import { Breadcrumb } from "./Breadcrumb";
import { useMe } from "@/lib/data-access";

/** Onboarding breadcrumb that adapts to first-time and existing members. */
export function OnboardingBreadcrumb({ current }: { current: string }) {
  const { isOnboarded } = useMe();
  const middle = isOnboarded
    ? { label: "Dashboard", href: "/dashboard" }
    : { label: "Sign up", href: "/signup/role" };
  return <Breadcrumb items={[{ label: "Home", href: "/" }, middle, { label: current }]} />;
}
