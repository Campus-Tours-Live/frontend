import { apiFetch, type ApiFetchInit } from "@/lib/http";

/** Error carrying the HTTP status, so the retry predicate can tell a client
 *  (4xx) error from a transient network/5xx one. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message?: string,
    /**
     * The problem+json `code`. Carried because status alone cannot distinguish failures that
     * demand opposite handling — notably N2's `AUTH_UPSTREAM_UNAVAILABLE` 503 ("your session
     * is fine, we just couldn't verify it") from any other 503.
     */
    public readonly code?: string,
    /** `Retry-After` in ms, when the server asked for a specific pace. */
    public readonly retryAfterMs?: number,
  ) {
    super(message ?? `HTTP ${status}`);
    this.name = "ApiError";
  }
}

/**
 * Build an {@link ApiError} from a non-ok {@link Response}, surfacing the backend's message so
 * callers (e.g. conflict notifications) show the real reason instead of a generic string.
 *
 * The backend/BFF send RFC 7807 problem+json on 4xx: `{ type, title, status, detail?, code? }`.
 * The human-readable message lives in `title` (backend validation errors set it to
 * `ex.getMessage()`); `detail` is a fallback for bodies that only set that field. Falls back to
 * the generic `Request failed (<status>)` when the body is empty, non-JSON, or has neither field.
 */
async function errorFromResponse(res: Response): Promise<ApiError> {
  let message: string | undefined;
  let code: string | undefined;
  try {
    const body = await res.json();
    if (body && typeof body === "object") {
      message =
        (typeof body.title === "string" && body.title) ||
        (typeof body.detail === "string" && body.detail) ||
        undefined;
      code = typeof body.code === "string" ? body.code : undefined;
    }
  } catch {
    // empty or non-JSON body — fall through to the generic message
  }
  // Optional-chained on purpose: this runs on the FAILURE path, where the least helpful
  // thing it could do is throw a TypeError of its own and replace a real 422 with noise.
  const retryAfter = Number(res.headers?.get("retry-after"));
  return new ApiError(
    res.status,
    message ?? `Request failed (${res.status})`,
    code,
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined,
  );
}

/** apiFetch + unwrap the `{ data }` envelope. Throws {@link ApiError} on non-2xx. */
export async function apiJson<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw await errorFromResponse(res);
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
  if (!res.ok) throw await errorFromResponse(res);
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
