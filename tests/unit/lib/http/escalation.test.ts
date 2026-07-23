import { apiFetch } from "@/lib/http";
import { requireAuth, getAuthNotice, clearAuthNotice, resetAuthGate } from "@/lib/auth";

/**
 * N3 — escalation is triggered by what the USER does, not by what the PAGE does.
 *
 * `interactive: boolean` could only say "modal or silence". M4 needed the loud option for a
 * dead session and so made the header's background read able to seize any page, including a
 * public one. The replacement splits that into three intents, so the same 401 can prompt
 * when the user asked for something and merely inform when it was a background read.
 */
jest.mock("@/lib/auth", () => {
  const actual = jest.requireActual<typeof import("@/lib/auth")>("@/lib/auth");
  return { ...actual, requireAuth: jest.fn().mockResolvedValue(undefined) };
});

const mockedRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

function res(status: number, headers: Record<string, string> = {}): Response {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (n: string) => map.get(n.toLowerCase()) ?? null },
    body: { cancel: jest.fn().mockResolvedValue(undefined) },
  } as unknown as Response;
}

const REAUTH = { "Auth-Required": "reauthenticate" };

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  mockedRequireAuth.mockReset().mockResolvedValue(undefined);
  resetAuthGate();
  clearAuthNotice();
});

describe('escalate: "prompt" (default) — the user asked for this', () => {
  it("opens the prompt on a re-auth 401", async () => {
    fetchMock.mockResolvedValueOnce(res(401, REAUTH)).mockResolvedValueOnce(res(200));

    await apiFetch("/v1/guide/profile");

    expect(mockedRequireAuth).toHaveBeenCalledTimes(1);
    expect(getAuthNotice()).toBeNull();
  });
});

describe('escalate: "ambient" — the page did this on its own', () => {
  it("raises the expired notice and does NOT open the prompt", async () => {
    fetchMock.mockResolvedValue(res(401, REAUTH));

    const response = await apiFetch("/v1/userinfo", { escalate: "ambient" });

    // The whole point: the page stays usable and nothing is seized.
    expect(mockedRequireAuth).not.toHaveBeenCalled();
    expect(getAuthNotice()).toBe("expired");
    // The 401 still reaches the caller so it can render its logged-out state.
    expect(response.status).toBe(401);
  });

  it("does not retry — there is nothing to retry until the user acts", async () => {
    fetchMock.mockResolvedValue(res(401, REAUTH));

    await apiFetch("/v1/userinfo", { escalate: "ambient" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stays silent on a plain 401 (no Auth-Required) — that is just 'not signed in'", async () => {
    fetchMock.mockResolvedValue(res(401));

    await apiFetch("/v1/userinfo", { escalate: "ambient" });

    expect(getAuthNotice()).toBeNull();
    expect(mockedRequireAuth).not.toHaveBeenCalled();
  });
});

describe('escalate: "none" — a public resource an anonymous visitor may read', () => {
  it("neither prompts nor raises a notice", async () => {
    fetchMock.mockResolvedValue(res(401, REAUTH));

    await apiFetch("/v1/meta/tour-topics", { escalate: "none" });

    expect(mockedRequireAuth).not.toHaveBeenCalled();
    expect(getAuthNotice()).toBeNull();
  });
});
