import { AuthCancelledError, SIGN_IN_AGAIN_MESSAGE, isAuthCancelled } from "@/lib/auth";
import { dayHoursErrorMessage } from "@/components/availability/DayHoursModal";
import {
  dateOverrideErrorMessage,
  previewErrorMessage,
} from "@/components/availability/DateOverrideModal";
import { toggleErrorMessage } from "@/components/availability/WeeklyHoursPanel";
import { ApiError } from "@/lib/data-access";
import { formSubmitErrorMessage } from "@/lib/errors";

/**
 * N1a Symptom A′, MUTATION half — the part the first pass missed.
 *
 * Every one of these helpers ends in a generic fallback ("Could not save … Please try
 * again."), and mutations go through the same interactive `apiFetch`, so a dismissed
 * sign-in prompt rejects with `AuthCancelledError` and lands in that fallback. On a WRITE
 * this is worse than on a read: the user is told their booking / hours / override failed to
 * save, when in fact it was never attempted. They retry, hit the same wall, report a bug.
 *
 * The fix belongs here rather than at each render site, because these sites render an
 * already-stringified message, not the error object.
 */
const cancelled = new AuthCancelledError();

describe("isAuthCancelled", () => {
  it("recognises a cancelled sign-in", () => {
    expect(isAuthCancelled(cancelled)).toBe(true);
  });

  it("does not claim ordinary failures", () => {
    expect(isAuthCancelled(new Error("boom"))).toBe(false);
    expect(isAuthCancelled(new ApiError(500, "Server error"))).toBe(false);
    expect(isAuthCancelled(null)).toBe(false);
  });
});

describe("formSubmitErrorMessage", () => {
  const copy = { invalid: "Check your inputs — title is required.", generic: "Could not save." };

  it("attributes a cancelled sign-in to auth, not to the save failing", () => {
    // The most expensive instance of this bug: these are LONG FORMS, and the full-page
    // redirect that follows the prompt destroys whatever the user had typed. Telling them
    // "could not save, please try again" — when the request was never sent — is the worst
    // version of the mis-attribution.
    expect(formSubmitErrorMessage(cancelled, copy)).toBe(SIGN_IN_AGAIN_MESSAGE);
  });

  it("keeps the 422 validation copy", () => {
    expect(formSubmitErrorMessage(new ApiError(422, "Unprocessable"), copy)).toBe(copy.invalid);
  });

  it("falls back to the generic copy for anything else", () => {
    expect(formSubmitErrorMessage(new Error("network"), copy)).toBe(copy.generic);
    expect(formSubmitErrorMessage(new ApiError(500, "Server"), copy)).toBe(copy.generic);
  });
});

describe.each([
  ["dayHoursErrorMessage", dayHoursErrorMessage],
  ["dateOverrideErrorMessage", dateOverrideErrorMessage],
  ["previewErrorMessage", previewErrorMessage],
  ["toggleErrorMessage", toggleErrorMessage],
])("%s", (_name, toMessage) => {
  it("attributes a cancelled sign-in to auth, not to the write failing", () => {
    expect(toMessage(cancelled)).toBe(SIGN_IN_AGAIN_MESSAGE);
  });

  it("still reports an ordinary failure in its own words", () => {
    const message = toMessage(new Error("network down"));
    expect(message).not.toBe(SIGN_IN_AGAIN_MESSAGE);
    expect(message.length).toBeGreaterThan(0);
  });

  it("still relays a backend 422 verbatim", () => {
    const message = toMessage(new ApiError(422, "That range overlaps another one."));
    expect(message).toBe("That range overlaps another one.");
  });
});
