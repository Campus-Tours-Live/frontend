import { type ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ParticipantOnboardingForm } from "@/components/signup/ParticipantOnboardingForm";
import { OnboardRetryableError } from "@/lib/data-access";
import { AuthCancelledError, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";
import { provisionedMe } from "../../../support/meFixtures";

// CTL-97 defer-provisioning (Task 4): the onboarding form is now a SINGLE command call —
// `onboardRole.mutateAsync({ role, body })` — with reconcile-driven navigation handled INSIDE the
// mutation (Task 3). These tests cover the two outcomes the main suite's always-resolving mock
// can't:
//  - the command resolves via an internal §4.3 reconcile (e.g. after a SESSION_CONVERSION_FAILED
//    or a network hiccup) — the form must still land on /dashboard, but ONLY once resolved.
//  - the command rejects `OnboardRetryableError` (§4.3 STILL_PENDING) — Core's commit state is
//    genuinely ambiguous, so the form must NOT treat this as a save failure: it stays up with a
//    retry affordance that RESUBMITS the exact same mapped body, never a fresh re-fill and never
//    a separate session-activation call (there is none any more).

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const mutateAsync = jest.fn();

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useMe: () => ({ me: null, isLoading: false, isOnboarded: false, hasRole: () => false }),
  useTourTopics: () => ({ data: [{ value: "academics", label: "Academics" }] }),
  useOnboardRole: () => ({ mutateAsync, isPending: false }),
  useUniversitySearch: () => ({ data: [], isFetching: false }),
}));

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function submitOnboarding(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), "Jordan");
  await user.type(screen.getByLabelText(/last name/i), "Lee");
  await user.click(screen.getByRole("button", { name: /continue/i })); // → universities
  await user.click(await screen.findByRole("button", { name: /continue/i })); // → topics
  await user.click(await screen.findByRole("checkbox", { name: /Academics/i }));
  await user.click(screen.getByRole("button", { name: /^submit$/i }));
}

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
});

describe("ParticipantOnboardingForm — reconcile-driven navigation", () => {
  it("navigates to /dashboard once the command resolves via an internal reconcile (SESSION_CONVERSION_FAILED/network), never before", async () => {
    let resolveMutation!: (me: unknown) => void;
    mutateAsync.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveMutation = resolve;
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);

    await submitOnboarding(user);

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();

    resolveMutation(provisionedMe({ roles: ["PARTICIPANT"], currentRole: "PARTICIPANT" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });
});

describe("ParticipantOnboardingForm — STILL_PENDING (OnboardRetryableError) retry", () => {
  it("stays on a retry panel (never a fresh re-fill), no navigation, then resubmits the SAME body on retry", async () => {
    mutateAsync.mockRejectedValueOnce(new OnboardRetryableError());
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);

    await submitOnboarding(user);

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();

    // Core's commit state is ambiguous, not a save failure — the retryable copy shows, and the
    // wizard's own fields are gone (there's nothing left to re-fill).
    expect(await screen.findByText(/couldn't confirm your role yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^submit$/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();

    // Retry resubmits the EXACT same mapped body — a resubmit is safe (a re-POST of an
    // already-granted role reconciles via 409 ROLE_ALREADY_GRANTED inside the mutation).
    mutateAsync.mockResolvedValueOnce(
      provisionedMe({ roles: ["PARTICIPANT"], currentRole: "PARTICIPANT" }),
    );
    await user.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    const [firstCall, secondCall] = mutateAsync.mock.calls as Array<
      [{ role: string; body: unknown }]
    >;
    expect(secondCall[0].role).toBe("PARTICIPANT");
    expect(secondCall[0].body).toEqual(firstCall[0].body);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("attributes a dismissed sign-in prompt (during the retry) to auth, not the save", async () => {
    mutateAsync.mockRejectedValueOnce(new OnboardRetryableError());
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);
    await submitOnboarding(user);
    expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();

    mutateAsync.mockRejectedValueOnce(new AuthCancelledError());
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText(SIGN_IN_AGAIN_MESSAGE)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
