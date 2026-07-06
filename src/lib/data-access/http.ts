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

type ProblemJson = {
  title?: string;
  detail?: string;
  message?: string;
};

async function readProblemMessage(res: Response): Promise<string | undefined> {
  try {
    const json = (await res.json()) as ProblemJson;
    return json.detail ?? json.title ?? json.message;
  } catch {
    return undefined;
  }
}

/** User-facing text when {@link ApiError} carries a server/business message. */
export function apiErrorMessage(err: ApiError): string | undefined {
  if (
    !err.message ||
    err.message === `HTTP ${err.status}` ||
    err.message === `Request failed (${err.status})`
  ) {
    return undefined;
  }
  return err.message;
}

/** apiFetch + unwrap the `{ data }` envelope. Throws {@link ApiError} on non-2xx. */
export async function apiJson<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const message = (await readProblemMessage(res)) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
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
