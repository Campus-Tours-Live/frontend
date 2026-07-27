import { type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ParticipantOnboardingForm } from "@/components/signup/ParticipantOnboardingForm";
import { AuthCancelledError, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";

// Variants that the main suite's fixed mock can't express: an empty tour-topics
// response, and a non-Error rejection.
const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const mutateAsync = jest.fn();
const setActiveRoleMutateAsync = jest.fn();
let topicsData: Array<{ value: string; label: string }> | undefined;

jest.mock("@/lib/data-access", () => ({
  useMe: () => ({ me: null, isLoading: false, isOnboarded: false, hasRole: () => false }),
  useTourTopics: () => ({ data: topicsData }),
  useUpdateParticipantProfile: () => ({ mutateAsync }),
  useSetActiveRole: () => ({ mutateAsync: setActiveRoleMutateAsync, isPending: false }),
  useUniversitySearch: () => ({ data: [], isFetching: false }),
}));

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue({});
  setActiveRoleMutateAsync.mockReset();
  setActiveRoleMutateAsync.mockResolvedValue({ activeRole: "PARTICIPANT" });
  topicsData = undefined;
});

async function gotoTopics(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), "Jordan");
  await user.type(screen.getByLabelText(/last name/i), "Lee");
  await user.click(screen.getByRole("button", { name: /continue/i })); // → universities
  await user.click(await screen.findByRole("button", { name: /continue/i })); // → topics
}

describe("ParticipantOnboardingForm edge cases", () => {
  it("shows a loading state when tour topics haven't arrived (empty default)", async () => {
    topicsData = undefined; // → topicOptions defaults to []
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);
    await gotoTopics(user);
    expect(await screen.findByText(/loading topics/i)).toBeInTheDocument();
  });

  it("Back returns to the previous step keeping entered values", async () => {
    topicsData = [{ value: "academics", label: "Academics" }];
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);
    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.click(screen.getByRole("button", { name: /continue/i })); // → universities
    expect(await screen.findByText(/universities of interest/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByLabelText(/first name/i)).toHaveValue("Jordan");
  });

  it("attributes a dismissed sign-in prompt to auth, not to onboarding failing", async () => {
    // AuthCancelledError IS an Error, so the old `err.message` path already showed
    // "Sign-in was cancelled." — correctly attributed but with no way to act on it, and
    // phrased differently from every other site. Route it through the canonical message.
    topicsData = [{ value: "academics", label: "Academics" }];
    mutateAsync.mockRejectedValueOnce(new AuthCancelledError());
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);
    await gotoTopics(user);
    await user.click(screen.getByRole("button", { name: /^submit$/i }));
    expect(await screen.findByText(SIGN_IN_AGAIN_MESSAGE)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a generic message when the rejection is not an Error", async () => {
    topicsData = [{ value: "academics", label: "Academics" }];
    mutateAsync.mockRejectedValueOnce("boom"); // non-Error rejection
    const user = userEvent.setup();
    renderWithQuery(<ParticipantOnboardingForm />);
    await gotoTopics(user);
    await user.click(screen.getByRole("button", { name: /^submit$/i }));
    expect(await screen.findByText(/something went wrong\. please try again/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
