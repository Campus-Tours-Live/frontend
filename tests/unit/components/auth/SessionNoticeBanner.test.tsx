import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
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
let client: QueryClient;

/** The banner triggers a principal refetch, so it needs a client in scope. */
function renderBanner(ui: ReactElement = <SessionNoticeBanner />) {
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  jest.useRealTimers();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  resetAuthGate();
  clearAuthNotice();
});

describe("SessionNoticeBanner", () => {
  it("renders nothing when there is no notice", () => {
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("on 'expired': says the session ended and offers a way back in", () => {
    renderBanner();

    act(() => notifyAuthNotice("expired"));

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/session (expired|ended)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("on 'unverifiable': says we can't verify, and offers NO sign-in", () => {
    renderBanner();

    act(() => notifyAuthNotice("unverifiable"));

    expect(screen.getByRole("status")).toBeInTheDocument();
    // The user is still signed in — telling them to sign in would be wrong AND would throw
    // away the session N2 went to some trouble to preserve.
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/expired/i)).not.toBeInTheDocument();
  });

  it("does not block the page — it is a banner, not a dialog", () => {
    renderBanner();

    act(() => notifyAuthNotice("expired"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("its sign-in control opens the prompt with force (the user asked for it)", async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeAuthGate(listener);
    renderBanner();
    act(() => notifyAuthNotice("expired"));
    listener.mockClear();

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(listener).toHaveBeenCalledWith(true);
    unsubscribe();
  });

  it("can be dismissed, and returns if a later background read hits the same wall", async () => {
    // Dismissal clears rather than suppresses: the session really is still dead, and the
    // banner blocks nothing, so re-stating it later is honest rather than naggy.
    renderBanner();
    act(() => notifyAuthNotice("expired"));

    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => notifyAuthNotice("expired"));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("swallows the rejection if the user opens the prompt then cancels", async () => {
    // requireAuth rejects with AuthCancelledError on cancel. Nothing awaits this call, so
    // without the .catch it would surface as an unhandled promise rejection.
    renderBanner();
    act(() => notifyAuthNotice("expired"));

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await act(async () => {
      cancelAuth();
    });

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("disappears once the notice is cleared", () => {
    renderBanner();
    act(() => notifyAuthNotice("expired"));
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => clearAuthNotice());

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("SessionNoticeBanner — Try again (sustained outage)", () => {
  it("offers a way to retry, since nothing else will", async () => {
    // There is no polling loop (deliberately — polling during a Google outage adds load to
    // the outage). Without this control the user's only options were navigating and luck.
    renderBanner();
    act(() => notifyAuthNotice("unverifiable", 5000));

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("refetches the principal when clicked", async () => {
    const refetch = jest.spyOn(client, "refetchQueries").mockResolvedValue(undefined);
    renderBanner();
    act(() => notifyAuthNotice("unverifiable", 5000));

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(refetch).toHaveBeenCalledWith({ queryKey: ["me"] });
  });

  it("respects the server's pace after a click, rather than allowing a hammer", async () => {
    // Retry-After governs AUTOMATIC retries; an explicit click is a different thing and is
    // allowed. But a struggling server still should not be hammered, so the click enters the
    // cooldown the server itself asked for.
    jest.useFakeTimers();
    jest.spyOn(client, "refetchQueries").mockResolvedValue(undefined);
    renderBanner();
    act(() => notifyAuthNotice("unverifiable", 5000));

    await userEvent.click(screen.getByRole("button", { name: /try again/i }), {
      advanceTimers: jest.advanceTimersByTime,
    });

    expect(screen.getByRole("button", { name: /try again/i })).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByRole("button", { name: /try again/i })).toBeEnabled();
  });

  it("falls back to a sane cooldown when the server did not specify one", async () => {
    jest.useFakeTimers();
    jest.spyOn(client, "refetchQueries").mockResolvedValue(undefined);
    renderBanner();
    act(() => notifyAuthNotice("unverifiable"));

    await userEvent.click(screen.getByRole("button", { name: /try again/i }), {
      advanceTimers: jest.advanceTimersByTime,
    });
    expect(screen.getByRole("button", { name: /try again/i })).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("button", { name: /try again/i })).toBeEnabled();
  });

  it("has no Try again on 'expired' — retrying cannot fix a cleared session", async () => {
    renderBanner();
    act(() => notifyAuthNotice("expired"));

    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
