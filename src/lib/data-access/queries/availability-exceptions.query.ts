import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { AvailabilityException } from "../types";

/** GET /v1/availability/exceptions — one-off overrides to the weekly rules. */
export const availabilityExceptionsOptions = () =>
  queryOptions({
    queryKey: queryKeys.availabilityExceptions(),
    queryFn: () => apiJson<AvailabilityException[]>("/v1/availability/exceptions"),
  });
