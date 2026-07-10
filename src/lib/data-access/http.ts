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
  const message = err.message?.trim();
  if (
    !message ||
    message === `Request failed (${err.status})` ||
    message === `HTTP ${err.status}`
  ) {
    return undefined;
  }
  return message;
}

async function readSuccessBody(res: Response): Promise<unknown> {
  if (typeof res.text === "function") {
    const text = await res.text();
    if (!text.trim()) return undefined;
    return JSON.parse(text);
  }
  return res.json();
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

  const json = await readSuccessBody(res);
  if (json === undefined) {
    return undefined as T;
  }

  return ((json as { data?: T })?.data ?? json) as T;
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
