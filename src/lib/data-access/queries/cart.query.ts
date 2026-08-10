// Client-only query options (via ../http -> apiFetch). Not for SSR prefetch.
import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { BookingResponse } from "../types";

/** GET /v1/cart — participant cart items, in the same Contract-A booking shape. */
export const cartOptions = () =>
  queryOptions({
    queryKey: queryKeys.cart(),
    queryFn: () => apiJson<BookingResponse[]>("/v1/cart"),
  });
