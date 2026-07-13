import { queryOptions } from "@tanstack/react-query";
import { postJson } from "../http";
import { queryKeys } from "../keys";
import type { OverrideMultiPreviewParams, OverridePreviewResponse } from "../types";

/**
 * POST /v1/availability/preview — the MULTI-window date-specific override dry-run (CTL-55
 * multi-slot). Posts `{ dateFrom, dateTo, kind, windows }` and returns the NET result of ALL
 * windows applied together — the same {@link OverridePreviewResponse} shape as the single-window
 * (GET) preview. It's a read expressed as a POST (the body carries an array), so it uses the JSON
 * POST helper and returns data (no mutation/invalidation).
 *
 * Disabled (no fetch) when `params` is null OR carries no windows — e.g. the override modal has no
 * structurally-valid slot yet. The FE only renders this response; it never merges the windows or
 * recomputes overlaps/trims itself (FE-never-recomputes).
 */
export const overrideMultiPreviewOptions = (params: OverrideMultiPreviewParams | null) =>
  queryOptions({
    queryKey: queryKeys.availabilityPreviewMulti(params),
    queryFn: () => {
      const p = params as OverrideMultiPreviewParams;
      return postJson<OverridePreviewResponse>("/v1/availability/preview", {
        dateFrom: p.dateFrom,
        dateTo: p.dateTo,
        kind: p.kind,
        windows: p.windows,
      });
    },
    enabled: params !== null && params.windows.length > 0,
  });
