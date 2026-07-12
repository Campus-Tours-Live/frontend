import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { OverridePreviewParams, OverridePreviewResponse } from "../types";

/**
 * GET /v1/availability/preview — a date-specific override dry-run (Block/Add-extra): the
 * affected dates' before/after windows + what would be trimmed, without writing anything.
 * Disabled (no fetch) when `params` is null — e.g. the override modal form isn't filled in yet.
 * The FE only renders this response; it never recomputes overlaps/trims itself.
 */
export const overridePreviewOptions = (params: OverridePreviewParams | null) =>
  queryOptions({
    queryKey: queryKeys.availabilityPreview(params),
    queryFn: () => {
      const p = params as OverridePreviewParams;
      const search = new URLSearchParams({
        dateFrom: p.dateFrom,
        dateTo: p.dateTo,
        kind: p.kind,
        startLocal: p.startLocal,
        windowMin: String(p.windowMin),
      });
      return apiJson<OverridePreviewResponse>(`/v1/availability/preview?${search.toString()}`);
    },
    enabled: params !== null,
  });
