import { clearAuthNotice, notifyAuthNotice, resetAuthGate, subscribeAuthNotice } from "@/lib/auth";

/**
 * N3 — the notice channel that lets an AMBIENT auth failure be reported without seizing the
 * page.
 *
 * The gate (`requireAuth`/`subscribeAuthGate`) is a *demand*: it blocks and waits for the
 * user. That is right when the user asked for something, and wrong when a background header
 * read discovered the session died — M4 wired the latter to the former, so a visitor merely
 * browsing a public page got a modal.
 *
 * This channel is the quiet half: state the situation, keep the page usable, let the user
 * decide when to act.
 */
beforeEach(() => {
  resetAuthGate();
  clearAuthNotice();
});

describe("auth notice channel", () => {
  it("delivers a notice to subscribers", () => {
    const seen: unknown[] = [];
    const unsubscribe = subscribeAuthNotice((n) => seen.push(n));

    notifyAuthNotice("expired");

    // The leading null is the immediate replay of "no notice yet" — see the next test.
    expect(seen).toEqual([null, "expired"]);
    unsubscribe();
  });

  it("replays the current notice to a late subscriber", () => {
    // The banner mounts in the layout, but a notice can fire from a request that resolved
    // before it mounted (or after a remount). Without replay the banner would silently miss it.
    notifyAuthNotice("expired");

    const seen: unknown[] = [];
    const unsubscribe = subscribeAuthNotice((n) => seen.push(n));

    expect(seen).toEqual(["expired"]);
    unsubscribe();
  });

  it("clears back to null", () => {
    const seen: unknown[] = [];
    notifyAuthNotice("expired");
    const unsubscribe = subscribeAuthNotice((n) => seen.push(n));

    clearAuthNotice();

    expect(seen).toEqual(["expired", null]);
    unsubscribe();
  });

  it("distinguishes 'expired' from 'unverifiable' — they demand opposite handling", () => {
    // expired  → the server cleared the cookie; the client must go anonymous.
    // unverifiable → the session is INTACT and the server knows it; going anonymous here
    // would be a false sign-out, which is the very bug N2 preserved the session to avoid.
    const seen: unknown[] = [];
    const unsubscribe = subscribeAuthNotice((n) => seen.push(n));

    notifyAuthNotice("unverifiable");
    notifyAuthNotice("expired");

    expect(seen).toEqual([null, "unverifiable", "expired"]);
    unsubscribe();
  });

  it("does not re-notify subscribers for an unchanged notice", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeAuthNotice(listener);
    listener.mockClear();

    notifyAuthNotice("expired");
    notifyAuthNotice("expired");

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stops delivering after unsubscribe", () => {
    const listener = jest.fn();
    subscribeAuthNotice(listener)();
    listener.mockClear();

    notifyAuthNotice("expired");

    expect(listener).not.toHaveBeenCalled();
  });
});
