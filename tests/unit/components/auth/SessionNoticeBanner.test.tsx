import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionNoticeBanner } from "@/components/auth/SessionNoticeBanner";
import {
  cancelAuth,
  clearAuthNotice,
  notifyAuthNotice,
  resetAuthGate,
  subscribeAuthGate,
} from "@/lib/auth";

/**
 * N3 — the non-blocking half. A banner states the situation and leaves the page alone.
 *
 * The two notices are NOT variants of one message. `expired` means the server cleared the
 * session and the user must sign in again; `unverifiable` means the session is intact and
 * the server said so — offering a sign-in there would be nonsense and would undo the whole
 * point of N2 preserving the session.
 */
beforeEach(() => {
  resetAuthGate();
  clearAuthNotice();
});

describe("SessionNoticeBanner", () => {
  it("renders nothing when there is no notice", () => {
    const { container } = render(<SessionNoticeBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("on 'expired': says the session ended and offers a way back in", () => {
    render(<SessionNoticeBanner />);

    act(() => notifyAuthNotice("expired"));

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/session (expired|ended)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("on 'unverifiable': says we can't verify, and offers NO sign-in", () => {
    render(<SessionNoticeBanner />);

    act(() => notifyAuthNotice("unverifiable"));

    expect(screen.getByRole("status")).toBeInTheDocument();
    // The user is still signed in — telling them to sign in would be wrong AND would throw
    // away the session N2 went to some trouble to preserve.
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/expired/i)).not.toBeInTheDocument();
  });

  it("does not block the page — it is a banner, not a dialog", () => {
    render(<SessionNoticeBanner />);

    act(() => notifyAuthNotice("expired"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("its sign-in control opens the prompt with force (the user asked for it)", async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeAuthGate(listener);
    render(<SessionNoticeBanner />);
    act(() => notifyAuthNotice("expired"));
    listener.mockClear();

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(listener).toHaveBeenCalledWith(true);
    unsubscribe();
  });

  it("can be dismissed, and returns if a later background read hits the same wall", async () => {
    // Dismissal clears rather than suppresses: the session really is still dead, and the
    // banner blocks nothing, so re-stating it later is honest rather than naggy.
    render(<SessionNoticeBanner />);
    act(() => notifyAuthNotice("expired"));

    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => notifyAuthNotice("expired"));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("swallows the rejection if the user opens the prompt then cancels", async () => {
    // requireAuth rejects with AuthCancelledError on cancel. Nothing awaits this call, so
    // without the .catch it would surface as an unhandled promise rejection.
    render(<SessionNoticeBanner />);
    act(() => notifyAuthNotice("expired"));

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await act(async () => {
      cancelAuth();
    });

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("disappears once the notice is cleared", () => {
    render(<SessionNoticeBanner />);
    act(() => notifyAuthNotice("expired"));
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => clearAuthNotice());

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
