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
const setActiveRoleMutateAsync = jest.fn();
let meValue: {
  user?: { firstName?: string; lastName?: string };
  roles?: string[];
} | null = null;
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
  useSetActiveRole: () => ({ mutateAsync: setActiveRoleMutateAsync, isPending: false }),
  // Majors are keyed off the selected school — empty until one is picked, matching
  // the real hook's `enabled: Boolean(schoolId)` gate.
  useMajors: (schoolId?: string | null) => ({
    data: schoolId
      ? [
          { value: "computer_science", label: "Computer Science" },
          { value: "economics", label: "Economics" },
        ]
      : [],
  }),
  // Degree levels are keyed off the selected school too (optional field).
  useDegrees: (schoolId?: string | null) => ({
    data: schoolId ? [{ value: "Bachelor's Degree", label: "Bachelor's Degree" }] : [],
  }),
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
  setActiveRoleMutateAsync.mockReset();
  setActiveRoleMutateAsync.mockResolvedValue({ activeRole: "GUIDE" });
  meValue = null;
  universityResults = [{ id: "u-1", name: "State University", shortName: "State" }];
});

/** Fill step 1 required fields and pick a university, leaving the form on step 1. */
async function completeStepOne(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), "Jordan");
  await user.type(screen.getByLabelText(/last name/i), "Lee");
  // University typeahead → pick the single mocked option. This unlocks the major
  // select (disabled until a university is chosen, since majors are loaded live
  // per-school via useMajors(selectedUniversity?.id)).
  await user.type(screen.getByPlaceholderText(/search universities/i), "state");
  await user.click(await screen.findByRole("button", { name: /State University/i }));
  // Major + degree are SelectMenu dropdowns (open, then pick the option); degree is required.
  await user.click(await screen.findByRole("combobox", { name: /major/i }));
  await user.click(await screen.findByRole("option", { name: "Computer Science" }));
  await user.click(screen.getByRole("combobox", { name: /degree/i }));
  await user.click(await screen.findByRole("option", { name: "Bachelor's Degree" }));
}

/** On step 2 ("Your guiding"), fill the now-required bio and pick a specialty. */
async function completeStepTwo(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    await screen.findByLabelText(/short bio/i),
    "I love showing students the maker space, dorms, and the best study spots on campus.",
  );
  await user.click(screen.getByRole("checkbox", { name: /Academics/i }));
}

describe("GuideOnboardingForm (multi-step wizard)", () => {
  it("renders step 1 (About you) and the step indicator", async () => {
    renderWithQuery(<GuideOnboardingForm />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    // Major is disabled until a university is picked (majors load live per-school).
    expect(screen.getByLabelText(/major/i)).toBeDisabled();
    expect(screen.getByText(/your university/i)).toBeInTheDocument();
    // Step indicator reflects step 1 of 3 and the current step name.
    expect(screen.getByText("Step 1 · About you")).toBeInTheDocument();
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
    expect(screen.getByText(/please select your major/i)).toBeInTheDocument();
    // Still on step 1 — step 2 content not shown.
    expect(screen.queryByLabelText(/short bio/i)).not.toBeInTheDocument();
    expect(document.querySelector('[aria-label="Step 1 of 3"]')).toBeInTheDocument();
  });

  it("advances to step 2 once step 1 is valid, and Back returns to step 1", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);

    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2 — "Your guiding" (the short-bio field marks the transition).
    expect(await screen.findByLabelText(/short bio/i)).toBeInTheDocument();
    expect(screen.getByText(/languages you can guide in/i)).toBeInTheDocument();

    // Back → step 1, with name preserved.
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByLabelText(/first name/i)).toHaveValue("Jordan");
  });

  it("walks all three steps and submits the mapped payload (submit:true, cents from dollars)", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2 — "Your guiding": bio + specialty are required.
    await completeStepTwo(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 3 — Verification (the school-email field marks the transition).
    const email = await screen.findByLabelText(/school email address/i);
    await user.type(email, "jordan@university.edu");

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Jordan",
        lastName: "Lee",
        universityId: "u-1",
        major: "computer_science",
        verificationEmail: "jordan@university.edu",
        specialties: ["academics"],
        submit: true,
      }),
    );
    // Languages default included.
    expect(mutateAsync.mock.calls[0][0].languages).toContain("en-US");
    // Onboarding partial-success: the profile grant is followed by an independent session
    // switch into the just-granted role (bff activeRole is session state, not a Core write).
    expect(setActiveRoleMutateAsync).toHaveBeenCalledWith("GUIDE");
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("submits the selected degree and a valid class year", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user); // selects the required degree
    const validYear = String(new Date().getFullYear() + 4);
    await user.type(screen.getByLabelText(/class year/i), validYear);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await completeStepTwo(user);
    await user.click(await screen.findByRole("button", { name: /continue/i }));
    await user.type(await screen.findByLabelText(/school email address/i), "jordan@university.edu");
    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ degree: "Bachelor's Degree", classYear: validYear }),
    );
  });

  it("blocks step 1 when the class year is outside the allowed range", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    // Far in the future → past the per-degree cap → validation error, stays on step 1.
    await user.type(screen.getByLabelText(/class year/i), String(new Date().getFullYear() + 40));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText(/graduation year between/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/short bio/i)).not.toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("toggles language and specialty chips off (deselect branches)", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2: drop the default "English", add "Spanish", and toggle a specialty on then off.
    await user.click(await screen.findByRole("checkbox", { name: /^English$/i })); // deselect default language
    await user.click(screen.getByRole("checkbox", { name: /^Spanish$/i })); // keep ≥1 language
    await user.click(screen.getByRole("checkbox", { name: /Academics/i })); // select a specialty (required ≥1)
    await user.click(screen.getByRole("checkbox", { name: /Dorm life/i })); // select a second specialty
    await user.click(screen.getByRole("checkbox", { name: /Dorm life/i })); // deselect it → exercises the filter branch
    await user.type(
      screen.getByLabelText(/short bio/i),
      "I love showing students the maker space, dorms, and the best study spots on campus.",
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.type(await screen.findByLabelText(/school email address/i), "jordan@university.edu");
    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    const payload = mutateAsync.mock.calls[0][0];
    expect(payload.languages).toEqual(["es"]);
    expect(payload.specialties).toEqual(["academics"]);
  });

  it("requires at least one language before leaving 'Your guiding'", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.click(screen.getByRole("button", { name: /continue/i })); // → Your guiding
    // English is on by default; deselect it → zero languages.
    await user.click(await screen.findByRole("checkbox", { name: /^English$/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText(/choose at least one language/i)).toBeInTheDocument();
    // Stayed on this step — Verification (school email) not reached.
    expect(screen.queryByLabelText(/school email address/i)).not.toBeInTheDocument();
  });

  it("strips characters that aren't allowed in a name as you type", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    // Digits/symbols are removed on input (sanitizeName → setValue); allowed punctuation stays.
    await user.type(screen.getByLabelText(/first name/i), "John5");
    await user.type(screen.getByLabelText(/last name/i), "O'Br@ien");
    expect(screen.getByLabelText(/first name/i)).toHaveValue("John");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("O'Brien");
  });

  it("rejects a class year that isn't four digits", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.type(screen.getByLabelText(/class year/i), "12"); // too short → format error
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/enter a 4-digit graduation year/i)).toBeInTheDocument();
  });

  it("clears the languages error once a language is reselected", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.click(screen.getByRole("button", { name: /continue/i })); // → Your guiding
    await user.click(await screen.findByRole("checkbox", { name: /^English$/i })); // deselect default
    await user.click(screen.getByRole("button", { name: /continue/i })); // → languages error
    expect(await screen.findByText(/choose at least one language/i)).toBeInTheDocument();
    // Reselecting a language clears the standing error (the `if (errors.languages)` branch).
    await user.click(screen.getByRole("checkbox", { name: /^Spanish$/i }));
    expect(screen.queryByText(/choose at least one language/i)).not.toBeInTheDocument();
  });

  it("clears the specialties error once a specialty is selected", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.click(screen.getByRole("button", { name: /continue/i })); // → Your guiding
    // Fill bio + keep the default language so only specialties (empty) blocks Continue.
    await user.type(
      await screen.findByLabelText(/short bio/i),
      "I love giving campus tours of the maker space and dorms.",
    );
    await user.click(screen.getByRole("button", { name: /continue/i })); // → specialties error
    expect(await screen.findByText(/choose at least one specialty/i)).toBeInTheDocument();
    // Selecting one clears the standing error (the `if (errors.specialties)` branch).
    await user.click(screen.getByRole("checkbox", { name: /Academics/i }));
    expect(screen.queryByText(/choose at least one specialty/i)).not.toBeInTheDocument();
  });

  it("prefills first/last name from useMe without clobbering or marking dirty", async () => {
    const user = userEvent.setup();
    meValue = { user: { firstName: "Sam", lastName: "Rivera" }, roles: ["PARTICIPANT"] };
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
    await completeStepTwo(user);
    await user.click(await screen.findByRole("button", { name: /continue/i }));
    await user.type(await screen.findByLabelText(/school email address/i), "jordan@university.edu");
    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(await screen.findByText(/school email already in use/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the required error when submitting step 3 with an empty school email", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await completeStepTwo(user);
    await user.click(await screen.findByRole("button", { name: /continue/i }));

    // On step 3, submit without touching the email. The message must appear and STAY (RHF's
    // focus-on-error must not trip the field's onFocus clearErrors and wipe it).
    await screen.findByLabelText(/school email address/i);
    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(await screen.findByText(/so we can send your verification link/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
