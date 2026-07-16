import { type ReactElement } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GuideOnboardingForm } from "@/components/signup/GuideOnboardingForm";

// ── Network/navigation + data-access boundary ───────────────────────────────
// We exercise the REAL react-hook-form flow and the component's own step state;
// only the data-access hooks (the network boundary) are mocked so we can drive
// `useMe` prefill, supply topic/university options, and assert the submit payload.

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const mutateAsync = jest.fn();
let meValue: { firstName?: string; lastName?: string; roles?: string[] } | null = null;
let universityResults: Array<{ id: string; name: string; shortName?: string }> = [];

jest.mock("@/lib/data-access", () => ({
  useMe: () => ({
    me: meValue,
    isLoading: false,
    isOnboarded: !!meValue && (meValue.roles?.length ?? 0) > 0,
    hasRole: () => false,
  }),
  useTourTopics: () => ({
    data: [
      { value: "academics", label: "Academics" },
      { value: "dorms", label: "Dorm life" },
    ],
  }),
  useUpdateGuideProfile: () => ({ mutateAsync }),
  // Used by the real UniversityMultiSelect rendered inside step 1.
  useUniversitySearch: (query: string, opts?: { enabled?: boolean }) => ({
    data: opts?.enabled === false ? [] : query ? universityResults : [],
    isFetching: false,
  }),
}));

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue({});
  meValue = null;
  universityResults = [{ id: "u-1", name: "State University", shortName: "State" }];
});

/** Fill step 1 required fields and pick a university, leaving the form on step 1. */
async function completeStepOne(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), "Jordan");
  await user.type(screen.getByLabelText(/last name/i), "Lee");
  await user.type(screen.getByLabelText(/major/i), "Computer Science");
  // University typeahead → pick the single mocked option.
  await user.type(screen.getByPlaceholderText(/search universities/i), "state");
  await user.click(await screen.findByRole("button", { name: /State University/i }));
}

describe("GuideOnboardingForm (multi-step wizard)", () => {
  it("renders step 1 (About you) and the step indicator", async () => {
    renderWithQuery(<GuideOnboardingForm />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/major/i)).toBeInTheDocument();
    expect(screen.getByText(/your university/i)).toBeInTheDocument();
    // Step indicator reflects step 1 of 3 and the current step name.
    expect(screen.getByText(/step 1 of 3 · About you/i)).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Step 1 of 3"]')).toBeInTheDocument();
    await act(async () => {});
  });

  it("shows the '✕ Cancel' control", async () => {
    renderWithQuery(<GuideOnboardingForm />);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    await act(async () => {});
  });

  it("blocks Continue while step 1 required fields are empty", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText(/please enter your first name/i)).toBeInTheDocument();
    expect(screen.getByText(/please enter your last name/i)).toBeInTheDocument();
    expect(screen.getByText(/select the university you currently attend/i)).toBeInTheDocument();
    expect(screen.getByText(/please enter your major/i)).toBeInTheDocument();
    // Still on step 1 — step 2 content not shown.
    expect(screen.queryByLabelText(/short bio/i)).not.toBeInTheDocument();
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
  });

  it("advances to step 2 once step 1 is valid, and Back returns to step 1", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);

    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2 — "Your guiding".
    expect(await screen.findByText(/step 2 of 3 · Your guiding/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/short bio/i)).toBeInTheDocument();
    expect(screen.getByText(/languages you can guide in/i)).toBeInTheDocument();

    // Back → step 1, with name preserved.
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByText(/step 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Jordan");
  });

  it("walks all three steps and submits the mapped payload (submit:true, cents from dollars)", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2 — set a base price in dollars (→ cents) and pick a specialty.
    const price = await screen.findByLabelText(/base price per tour/i);
    await user.clear(price);
    await user.type(price, "40");
    await user.click(screen.getByRole("button", { name: /Academics/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 3 — Verification.
    expect(await screen.findByText(/step 3 of 3 · Verification/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/school email address/i), "jordan@university.edu");

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Jordan",
        lastName: "Lee",
        universityId: "u-1",
        major: "Computer Science",
        basePriceCents: 4000,
        verificationEmail: "jordan@university.edu",
        specialties: ["academics"],
        submit: true,
      }),
    );
    // Languages default included.
    expect(mutateAsync.mock.calls[0][0].languages).toContain("en-US");
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("toggles language and specialty chips off (deselect branches)", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2: drop the default "English", add "Spanish", and toggle a specialty on then off.
    await user.click(await screen.findByRole("button", { name: /^English$/i })); // deselect default language
    await user.click(screen.getByRole("button", { name: /^Spanish$/i })); // keep ≥1 language
    await user.click(screen.getByRole("button", { name: /Academics/i })); // select specialty
    await user.click(screen.getByRole("button", { name: /Academics/i })); // deselect specialty
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.type(await screen.findByLabelText(/school email address/i), "jordan@university.edu");
    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    const payload = mutateAsync.mock.calls[0][0];
    expect(payload.languages).toEqual(["es"]);
    expect(payload.specialties).toEqual([]);
  });

  it("does not advance past step 2 with an out-of-range base price", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.click(screen.getByRole("button", { name: /continue/i })); // → step 2

    const price = await screen.findByLabelText(/base price per tour/i);
    await user.clear(price);
    await user.type(price, "10"); // below the $20 minimum
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // validate("10") hits the out-of-range branch → step 2 stays put, no step 3.
    expect(screen.queryByLabelText(/school email address/i)).not.toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("prefills first/last name from useMe without clobbering or marking dirty", async () => {
    const user = userEvent.setup();
    meValue = { firstName: "Sam", lastName: "Rivera", roles: ["PARTICIPANT"] };
    renderWithQuery(<GuideOnboardingForm />);

    // Prefilled from the account.
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Sam");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("Rivera");

    // Prefill uses setValue without shouldDirty → Cancel must NOT confirm
    // (a pristine form leaves immediately). Clicking Cancel navigates straight away.
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText(/discard your progress/i)).not.toBeInTheDocument();
    // isOnboarded (has a role) → leaves to /dashboard.
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("renders an error alert when the submit mutation rejects", async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValueOnce(new Error("School email already in use."));
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(await screen.findByRole("button", { name: /continue/i }));
    await user.type(await screen.findByLabelText(/school email address/i), "jordan@university.edu");
    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(await screen.findByText(/school email already in use/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
