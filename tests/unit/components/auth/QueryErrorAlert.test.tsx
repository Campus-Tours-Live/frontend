import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryErrorAlert } from "@/components/auth/QueryErrorAlert";
import { AuthCancelledError, cancelAuth, resetAuthGate, subscribeAuthGate } from "@/lib/auth";

/**
 * N1a Symptom A′ — a dismissed sign-in prompt must not be reported as a broken page.
 *
 * `AuthCancelledError` had no UI handling anywhere: its only reference outside `lib/auth`
 * was the retry predicate in QueryProvider. So it surfaced through each component's generic
 * branch — "Failed to load your tour offerings." — telling the user the page is broken when
 * the real cause was "you dismissed the sign-in prompt". They retry, it fails again, they
 * report a bug. Mis-attribution is worse than silence.
 */
beforeEach(() => {
  resetAuthGate();
});

describe("QueryErrorAlert", () => {
  it("shows the caller's message for an ordinary failure", () => {
    render(<QueryErrorAlert error={new Error("boom")}>Failed to load your tours.</QueryErrorAlert>);
    expect(screen.getByText("Failed to load your tours.")).toBeInTheDocument();
  });

  it("shows an auth prompt — NOT the load-failure message — after a cancelled sign-in", () => {
    render(
      <QueryErrorAlert error={new AuthCancelledError()}>
        Failed to load your tours.
      </QueryErrorAlert>,
    );

    expect(screen.queryByText("Failed to load your tours.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("its control re-opens the prompt even though the user just declined (force)", async () => {
    // Without `force` this button would be swallowed by the very suppression the user's
    // cancel installed — the control would look broken.
    const listener = jest.fn();
    const unsubscribe = subscribeAuthGate(listener);
    cancelAuth(); // user declined in this epoch

    render(<QueryErrorAlert error={new AuthCancelledError()}>Failed to load.</QueryErrorAlert>);
    listener.mockClear();

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(listener).toHaveBeenCalledWith(true);
    unsubscribe();
    cancelAuth();
  });

  it("renders the caller's message when there is no error object", () => {
    render(<QueryErrorAlert error={null}>Failed to load.</QueryErrorAlert>);
    expect(screen.getByText("Failed to load.")).toBeInTheDocument();
  });
});
