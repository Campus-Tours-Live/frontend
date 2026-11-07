"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { GuideBookingFilter } from "@/lib/data-access";

const FILTERS = new Set<GuideBookingFilter>(["pending", "upcoming", "all"]);

export function parseGuideBookingFilter(raw: string | null): GuideBookingFilter {
  if (raw && FILTERS.has(raw as GuideBookingFilter)) return raw as GuideBookingFilter;
  return "all";
}

/** Guide inbox filter persisted in `?filter=` so nav links and refresh restore the view. */
export function useGuideBookingFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filter = parseGuideBookingFilter(params.get("filter"));

  const setFilter = useCallback(
    (next: GuideBookingFilter) => {
      const nextParams = new URLSearchParams(params.toString());
      if (next === "all") nextParams.delete("filter");
      else nextParams.set("filter", next);
      const qs = nextParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [params, pathname, router],
  );

  return { filter, setFilter };
}
