import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { AvailabilitySettings } from "../types";

/** GET /v1/availability/settings — the guide's booking policy (acceptance mode, buffers, tz, …). */
export const availabilitySettingsOptions = () =>
  queryOptions({
    queryKey: queryKeys.availabilitySettings(),
    queryFn: () => apiJson<AvailabilitySettings>("/v1/availability/settings"),
  });
