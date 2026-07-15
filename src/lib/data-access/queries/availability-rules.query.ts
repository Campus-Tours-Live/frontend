import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { AvailabilityRule } from "../types";

/** GET /v1/availability/rules — the guide's recurring start+duration availability rules. */
export const availabilityRulesOptions = () =>
  queryOptions({
    queryKey: queryKeys.availabilityRules(),
    queryFn: () => apiJson<AvailabilityRule[]>("/v1/availability/rules"),
  });
