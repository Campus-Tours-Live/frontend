"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import {
  advanceAuthEpoch,
  subscribeAuthGate,
  subscribeAuthNotice,
} from "@/lib/auth";
import { queryKeys } from "@/lib/data-access/keys";

/**
 * Keeps the React Query auth cache synchronized with the auth module.
 * This component has no UI.
 */
export function AuthGateSync() {
  const queryClient = useQueryClient();
  const pathname = usePathname();

  useEffect(() => {
    return subscribeAuthNotice((state) => {
      if (state?.notice !== "expired") return;

      queryClient.setQueryData(queryKeys.session(), false);
      queryClient.removeQueries({ queryKey: queryKeys.me() });
    });
  }, [queryClient]);

  useEffect(() => {
    return subscribeAuthGate((open) => {
      if (!open) return;

      queryClient.setQueryData(queryKeys.session(), false);
      queryClient.removeQueries({ queryKey: queryKeys.me() });
    });
  }, [queryClient]);

  useEffect(() => {
    advanceAuthEpoch();
  }, [pathname]);

  return null;
}
