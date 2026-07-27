import { type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ParticipantOnboardingForm } from "@/components/signup/ParticipantOnboardingForm";
import { AuthCancelledError, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";

// Onboarding partial-success (Profile Contract v2): the Core write (grant the PARTICIPANT role)
// and the bff session's activeRole switch are two independent calls. These tests cover the case
// the main suite's always-resolving `useSetActiveRole` mock can't: submit succeeds, the switch
// fails. The requirement (see the v2c-t1.5FE brief) is that this reads as a SESSION-init
// failure, not a save failure — no re-submit, retryable, no "not saved" wording.

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const mutateAsync = jest.fn();
const setActiveRoleMutateAsync = jest.fn();

jest.mock("@/lib/data-access", () => ({
  useMe: () => ({ me: null, isLoading: false, isOnboarded: false, hasRole: () => false }),
  useTourTopics: () => ({ data: [{ value: "academics", label: "Academics" }] }),
  useUpdateParticipantProfile: () => ({ mutateAsync }),
  useSetActiveRole: () => ({ mutateAsync: setActiveRoleMutateAsync, isPending: false }),
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
  mutateAsync.mockResolvedValue({});
  setActiveRoleMutateAsync.mockReset();
});

describe("ParticipantOnboardingForm — onboarding-OK, session-init failed", () => {
  it("shows a session-init error (not a save failure), never re-submits, and is retryable", async () => {
    setActiveRoleMutateAsync.mockRejectedValueOnce(new Error("403"));
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);

    await submitOnboarding(user);

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(setActiveRoleMutateAsync).toHaveBeenCalledTimes(1);
    expect(setActiveRoleMutateAsync).toHaveBeenCalledWith("PARTICIPANT");
    expect(push).not.toHaveBeenCalled();

    // The profile IS saved — the message must say so, not claim the opposite.
    const message = await screen.findByText(/profile is saved/i);
    expect(message).toBeInTheDocument();
    expect(screen.queryByText(/not saved/i)).not.toBeInTheDocument();

    // Done state held: the wizard is gone, so there is nothing left to (re-)submit.
    expect(screen.queryByRole("button", { name: /^submit$/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();

    // Retry re-runs ONLY the session switch.
    setActiveRoleMutateAsync.mockResolvedValueOnce({ activeRole: "PARTICIPANT" });
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(mutateAsync).toHaveBeenCalledTimes(1); // never re-submitted
    expect(setActiveRoleMutateAsync).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("attributes a dismissed sign-in prompt (during the switch) to auth, not the save", async () => {
    setActiveRoleMutateAsync.mockRejectedValueOnce(new AuthCancelledError());
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);

    await submitOnboarding(user);

    expect(await screen.findByText(SIGN_IN_AGAIN_MESSAGE)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
