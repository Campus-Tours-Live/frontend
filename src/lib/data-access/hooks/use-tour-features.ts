"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { tourFeatureOptionsQuery } from "../queries/tour-features.query";

/**
 * The backend feature catalog (GET /v1/meta/tour-features): per-topic options for the tour-create
 * form, plus a flat `labelByCode` map so cards can render feature chips without hardcoding labels.
 */
export function useTourFeatures() {
  const query = useQuery(tourFeatureOptionsQuery());
  const labelByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const options of Object.values(query.data ?? {})) {
      for (const o of options) map[o.value] = o.label;
    }
    return map;
  }, [query.data]);
  return {
    byTopic: query.data ?? {},
    labelByCode,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
