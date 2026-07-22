import {
  AuthCancelledError,
  advanceAuthEpoch,
  cancelAuth,
  completeAuth,
  requireAuth,
  resetAuthGate,
  subscribeAuthGate,
} from "@/lib/auth";

/**
 * N1a Symptom A — a Cancel must mean "not right now", not "never ask again".
 *
 * The old gate recorded a Cancel in a module-level `suppressed` boolean whose only two
 * clearers (`completeAuth` / `resetAuthGate`) had zero production callers. One Cancel
 * therefore disabled re-auth for the entire page lifetime: every later interactive request
 * rejected immediately, including a deliberate "Book this tour" the user clicked minutes
 * later. Only a full page reload recovered.
 *
 * Suppression is now scoped to an auth EPOCH, so it self-heals at the next auth event
 * (route change, explicit force). Same nag-protection, no permanent poisoning.
 */
beforeEach(() => {
  resetAuthGate();
});

describe("suppression is scoped to an epoch", () => {
  it("still suppresses background 401s within the SAME epoch (no nagging)", async () => {
    requireAuth();
    cancelAuth();

    const listener = jest.fn();
    const unsubscribe = subscribeAuthGate(listener);

    await expect(requireAuth()).rejects.toBeInstanceOf(AuthCancelledError);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("self-heals at the next epoch — a later 401 re-opens the prompt", async () => {
    requireAuth();
    cancelAuth();

    advanceAuthEpoch(); // e.g. the user navigated to another route

    const listener = jest.fn();
    const unsubscribe = subscribeAuthGate(listener);

    const pending = requireAuth();

    expect(listener).toHaveBeenCalledWith(true);
    expect(pending).toBeInstanceOf(Promise);
    unsubscribe();
    cancelAuth(); // settle the promise so it doesn't leak
    await expect(pending).rejects.toBeInstanceOf(AuthCancelledError);
  });

  it("a cancel in the NEW epoch suppresses only that epoch", async () => {
    requireAuth();
    cancelAuth();
    advanceAuthEpoch();
    requireAuth();
    cancelAuth();

    await expect(requireAuth()).rejects.toBeInstanceOf(AuthCancelledError);

    advanceAuthEpoch();
    const listener = jest.fn();
    const unsubscribe = subscribeAuthGate(listener);
    requireAuth();
    expect(listener).toHaveBeenCalledWith(true);
    unsubscribe();
  });

  it("advancing the epoch without a prior cancel changes nothing", () => {
    advanceAuthEpoch();

    const listener = jest.fn();
    const unsubscribe = subscribeAuthGate(listener);
    requireAuth();
    expect(listener).toHaveBeenCalledWith(true);
    unsubscribe();
  });

  it("force still bypasses suppression within the same epoch", () => {
    requireAuth();
    cancelAuth();

    const listener = jest.fn();
    const unsubscribe = subscribeAuthGate(listener);

    requireAuth({ force: true });

    expect(listener).toHaveBeenCalledWith(true);
    unsubscribe();
  });

  it("completeAuth lifts suppression and advances the epoch", () => {
    requireAuth();
    cancelAuth();
    completeAuth();

    const listener = jest.fn();
    const unsubscribe = subscribeAuthGate(listener);
    requireAuth();
    expect(listener).toHaveBeenCalledWith(true);
    unsubscribe();
  });
});
