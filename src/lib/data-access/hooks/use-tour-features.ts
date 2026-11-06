"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { tourFeatureOptionsQuery } from "../queries/tour-features.query";
import type { TourFeatureOptionsByTopic } from "../types";

/** Stable empty catalog so consumers can safely put `byTopic` in effect deps while loading. */
const EMPTY_BY_TOPIC: TourFeatureOptionsByTopic = {};

/**
 * The backend feature catalog (GET /v1/meta/tour-features): per-topic options for the tour-create
 * form, plus a flat `labelByCode` map so cards can render feature chips without hardcoding labels.
 */
export function useTourFeatures() {
  const query = useQuery(tourFeatureOptionsQuery());
  const labelByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const options of Object.values(query.data ?? EMPTY_BY_TOPIC)) {
      for (const o of options) map[o.value] = o.label;
    }
    return map;
  }, [query.data]);
  return {
    byTopic: query.data ?? EMPTY_BY_TOPIC,
    labelByCode,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
