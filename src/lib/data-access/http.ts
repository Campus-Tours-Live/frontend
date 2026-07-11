import { apiFetch, type ApiFetchInit } from "@/lib/http";

/** Error carrying the HTTP status, so the retry predicate can tell a client
 *  (4xx) error from a transient network/5xx one. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message?: string,
  ) {
    super(message ?? `HTTP ${status}`);
    this.name = "ApiError";
  }
}

/** apiFetch + unwrap the `{ data }` envelope. Throws {@link ApiError} on non-2xx. */
export async function apiJson<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new ApiError(res.status, `Request failed (${res.status})`);
  const json = await res.json();
  return (json?.data ?? json) as T;
}

/** PATCH JSON convenience over {@link apiJson}. */
export function patchJson<T>(path: string, body: unknown): Promise<T> {
  return apiJson<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** POST JSON convenience over {@link apiJson}. */
export function postJson<T>(path: string, body: unknown): Promise<T> {
  return apiJson<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * apiFetch + return the parsed JSON body **unchanged** (no `{ data }` unwrap). For endpoints whose
 * envelope carries sibling top-level fields a caller needs alongside `data` (e.g. the availability
 * write envelope's `affectedBookings`) — {@link apiJson} would silently drop them. Throws
 * {@link ApiError} on non-2xx, same as apiJson.
 */
export async function apiJsonRaw<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new ApiError(res.status, `Request failed (${res.status})`);
  return (await res.json()) as T;
}

/** POST JSON convenience over {@link apiJsonRaw} — keeps the full response envelope. */
export function postJsonRaw<T>(path: string, body: unknown): Promise<T> {
  return apiJsonRaw<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** PATCH JSON convenience over {@link apiJsonRaw} — keeps the full response envelope. */
export function patchJsonRaw<T>(path: string, body: unknown): Promise<T> {
  return apiJsonRaw<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** DELETE convenience over {@link apiJsonRaw} — keeps the full response envelope (e.g. the
 *  remaining list a DELETE returns in `data`). */
export function deleteJsonRaw<T>(path: string): Promise<T> {
  return apiJsonRaw<T>(path, { method: "DELETE" });
}
