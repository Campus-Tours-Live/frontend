import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { Offering } from "../types";

/** GET /v1/guide/offerings — the signed-in guide's own tour products. */
export const offeringsOptions = () =>
  queryOptions({
    queryKey: queryKeys.guideOfferings(),
    queryFn: () => apiJson<Offering[]>("/v1/guide/offerings"),
  });
