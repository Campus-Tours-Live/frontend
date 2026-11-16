"use client";

import { useQueries } from "@tanstack/react-query";
import { universityDetailOptions } from "../queries/university-detail.query";

/**
 * Several universities' details at once (one GET /v1/universities/{slug} each, fetched in
 * parallel and cached per slug). Results come back in the same order as `slugs`, each with its own
 * loading/error state — a slug that 404s does not hide the others.
 */
export function useUniversityDetails(slugs: readonly string[]) {
  return useQueries({ queries: slugs.map((slug) => universityDetailOptions(slug)) });
}
