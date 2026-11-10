// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { MetaOption } from "../types";

/**
 * GET /v1/meta/languages — supported BCP-47 tags a guide may attach to a profile or tour offering.
 */
export const languagesOptions = () =>
  queryOptions({
    queryKey: queryKeys.languages(),
    queryFn: () => apiJson<MetaOption[]>("/v1/meta/languages", { escalate: "none" }),
    staleTime: Infinity,
  });
