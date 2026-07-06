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

/** DELETE convenience over {@link apiJson}. */
export function deleteJson<T = void>(path: string): Promise<T> {
  return apiJson<T>(path, { method: "DELETE" });
}
