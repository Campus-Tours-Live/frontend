"use client";

import { useQuery } from "@tanstack/react-query";
import { languagesOptions } from "../queries/languages.query";

/** Supported tour/profile languages (GET /v1/meta/languages). */
export function useLanguages() {
  return useQuery(languagesOptions());
}
