import { type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GuideOnboardingForm } from "@/components/signup/GuideOnboardingForm";

// Variants the main suite's fixed mock can't express: empty tour-topics, a
// non-Error rejection, and an empty base price.
const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const mutateAsync = jest.fn();
let topicsData: Array<{ value: string; label: string }> | undefined;

jest.mock("@/lib/data-access", () => ({
  useMe: () => ({ me: null, isLoading: false, isOnboarded: false, hasRole: () => false }),
  useTourTopics: () => ({ data: topicsData }),
  useUpdateGuideProfile: () => ({ mutateAsync }),
  useUniversitySearch: (query: string, opts?: { enabled?: boolean }) => ({
    data:
      opts?.enabled === false
        ? []
        : query
          ? [{ id: "u-1", name: "State University", shortName: "State" }]
          : [],
    isFetching: false,
  }),
}));

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function completeStepOne(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), "Jordan");
  await user.type(screen.getByLabelText(/last name/i), "Lee");
  await user.type(screen.getByLabelText(/major/i), "Computer Science");
  await user.type(screen.getByPlaceholderText(/search universities/i), "state");
  await user.click(await screen.findByRole("button", { name: /State University/i }));
}

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue({});
  topicsData = [{ value: "academics", label: "Academics" }];
});

describe("GuideOnboardingForm edge cases", () => {
  it("shows a loading state for specialties when topics haven't arrived", async () => {
    topicsData = undefined; // → topicOptions defaults to []
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/^Loading…$/)).toBeInTheDocument();
  });

  it("omits basePriceCents when the price is cleared", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.clear(await screen.findByLabelText(/base price per tour/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.type(await screen.findByLabelText(/school email address/i), "jordan@university.edu");
    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync.mock.calls[0][0].basePriceCents).toBeUndefined();
  });

  it("shows a generic message when the rejection is not an Error", async () => {
    mutateAsync.mockRejectedValueOnce("boom"); // non-Error rejection
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(await screen.findByRole("button", { name: /continue/i }));
    await user.type(await screen.findByLabelText(/school email address/i), "jordan@university.edu");
    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(await screen.findByText(/something went wrong\. please try again/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
