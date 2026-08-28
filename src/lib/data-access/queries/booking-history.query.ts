import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { BookingResponse } from "../types";

/** Participant's completed past tours — GET /v1/bookings/history. */
export const bookingHistoryOptions = () =>
  queryOptions({
    queryKey: queryKeys.bookingHistory(),
    queryFn: () => apiJson<BookingResponse[]>("/v1/bookings/history"),
  });
