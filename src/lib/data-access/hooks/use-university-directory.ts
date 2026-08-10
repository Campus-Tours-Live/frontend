"use client";

import { useQuery } from "@tanstack/react-query";
import {
  stateUniversitiesQuery,
  universityCountsQuery,
} from "../queries/university-directory.query";

/**
 * How many universities each state has (GET /v1/universities/state-summary) — the figures on the
 * browse-by-state page.
 *
 * Its `isError` is meaningful and must be rendered: Core answers 503 rather than a map of zeros
 * when the directory cannot be read, precisely so that "we do not know" never reaches a visitor
 * disguised as "this state has none".
 */
export function useUniversityCounts() {
  return useQuery(universityCountsQuery());
}

/**
 * One state's universities (GET /v1/universities?state=XX), sorted by name.
 *
 * Pass an empty string to hold the request — the query stays idle rather than asking Core for a
 * state that was never chosen. Each state is cached under its own key, so switching a filter back
 * to somewhere already visited costs nothing.
 */
export function useStateUniversities(stateCode: string) {
  return useQuery(stateUniversitiesQuery(stateCode));
}
