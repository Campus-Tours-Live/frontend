import { type ReactElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GuideOnboardingForm } from "@/components/signup/GuideOnboardingForm";
import { ApiError, type Me } from "@/lib/data-access";
import { pendingMe, provisionedMe } from "../../../support/meFixtures";

// ── Network/navigation + data-access boundary ───────────────────────────────
// We exercise the REAL react-hook-form flow and the component's own step state;
// only the data-access hooks (the network boundary) are mocked so we can drive
// `useMe` prefill, supply topic/university options, and assert the submit payload.
// `jest.requireActual` keeps the REAL `ApiError`/`OnboardRetryableError`/`getOnboardingPrefill`
// (spread onto the mock) so the component's `instanceof`/branch logic exercises the genuine
// classes, not fakes — and the test file importing the same names gets the same identities.

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const mutateAsync = jest.fn();
let meValue: Me | null = null;
let universityResults: Array<{ id: string; name: string; shortName?: string }> = [];

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useMe: () => ({
    me: meValue,
    isLoading: false,
    isOnboarded: meValue?.accountState === "PROVISIONED",
    hasRole: () => false,
  }),
  useTourTopics: () => ({
    data: [
      { value: "academics", label: "Academics" },
      { value: "dorms", label: "Dorm life" },
    ],
  }),
  useOnboardRole: () => ({ mutateAsync, isPending: false }),
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
  // Degree levels the SELECTED school awards (live) — empty until one is picked (optional field).
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
  mutateAsync.mockResolvedValue(provisionedMe({ roles: ["GUIDE"], currentRole: "GUIDE" }));
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

/** Walks the wizard to the final step and clicks Submit — does not assert the outcome. */
async function completeAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await completeStepOne(user);
  await user.click(screen.getByRole("button", { name: /continue/i }));
  await completeStepTwo(user);
  await user.click(await screen.findByRole("button", { name: /continue/i }));
  await user.type(await screen.findByLabelText(/school email address/i), "jordan@university.edu");
  await user.click(screen.getByRole("button", { name: /^submit$/i }));
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

  it("walks all three steps and submits the mapped command body ONCE (no `submit` field)", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeAndSubmit(user);

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    const [arg] = mutateAsync.mock.calls[0] as [{ role: string; body: Record<string, unknown> }];
    expect(arg.role).toBe("GUIDE");
    expect(arg.body).toEqual(
      expect.objectContaining({
        firstName: "Jordan",
        lastName: "Lee",
        universityId: "u-1",
        major: "computer_science",
        verificationEmail: "jordan@university.edu",
        tourTopics: ["academics"],
      }),
    );
    // The command body has NO `submit` field — that was the old PATCH-submit's field; the
    // command endpoint has no such field.
    expect(arg.body).not.toHaveProperty("submit");
    // Languages default included.
    expect(arg.body.spokenLanguages).toContain("en-US");
    // Navigation happens ONLY once the mutation RESOLVES a ProvisionedMe holding GUIDE — there is
    // no separate setCurrentRole step any more.
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("does NOT navigate while the mutation is pending; navigates only once it resolves", async () => {
    let resolveMutation!: (me: unknown) => void;
    mutateAsync.mockReset();
    mutateAsync.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveMutation = resolve;
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeAndSubmit(user);

    // Still pending — never an optimistic early flip.
    expect(push).not.toHaveBeenCalled();

    // Resolves (e.g. after the mutation's own internal §4.3 reconcile following a
    // SESSION_CONVERSION_FAILED/network hiccup) — navigation follows the resolve, not before it.
    resolveMutation(provisionedMe({ roles: ["GUIDE"], currentRole: "GUIDE" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("submits the selected degree, a valid class year, and a valid entry year (as a number)", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user); // selects the required degree
    const validYear = String(new Date().getFullYear() + 4);
    const validEntryYear = String(new Date().getFullYear() - 2);
    await user.type(screen.getByLabelText(/class year/i), validYear);
    await user.type(screen.getByLabelText(/entry year/i), validEntryYear);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await completeStepTwo(user);
    await user.click(await screen.findByRole("button", { name: /continue/i }));
    await user.type(await screen.findByLabelText(/school email address/i), "jordan@university.edu");
    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    const [arg] = mutateAsync.mock.calls[0] as [{ body: Record<string, unknown> }];
    expect(arg.body).toEqual(
      expect.objectContaining({
        degree: "Bachelor's Degree",
        classYear: validYear,
        entryYear: Number(validEntryYear),
      }),
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

  it("rejects an entry year that isn't four digits", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    await user.type(screen.getByLabelText(/entry year/i), "12"); // too short → format error
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/enter a 4-digit entry year/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("blocks step 1 when the entry year is outside the allowed range", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    // Far in the future → past the +1 cap → validation error, stays on step 1.
    await user.type(screen.getByLabelText(/entry year/i), String(new Date().getFullYear() + 40));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText(/entry year between/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/short bio/i)).not.toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("clears the entry-year error on focus and re-validates on blur", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeStepOne(user);
    const entryYearField = screen.getByLabelText(/entry year/i);
    await user.type(entryYearField, "12");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/enter a 4-digit entry year/i)).toBeInTheDocument();

    // Focusing clears the standing error (matches the classYear/bio/etc. pattern in this form).
    await user.click(entryYearField);
    expect(screen.queryByText(/enter a 4-digit entry year/i)).not.toBeInTheDocument();

    // Blurring with a valid value re-validates (via `trigger`) without raising a new error.
    await user.clear(entryYearField);
    await user.type(entryYearField, String(new Date().getFullYear() - 1));
    await user.tab();
    expect(screen.queryByText(/enter a 4-digit entry year/i)).not.toBeInTheDocument();
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

    const [arg] = mutateAsync.mock.calls[0] as [{ body: Record<string, unknown> }];
    expect(arg.body.spokenLanguages).toEqual(["es"]);
    expect(arg.body.tourTopics).toEqual(["academics"]);
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

  it("prefills from getOnboardingPrefill for a PendingMe (first onboarding)", async () => {
    meValue = pendingMe({ firstName: "Sam", lastName: "Rivera" });
    renderWithQuery(<GuideOnboardingForm />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue("Sam");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("Rivera");
    await act(async () => {});
  });

  it("prefills from getOnboardingPrefill for a ProvisionedMe (second-role acquisition), without clobbering or marking dirty", async () => {
    const user = userEvent.setup();
    meValue = provisionedMe({ roles: ["PARTICIPANT"], firstName: "Grace", lastName: "Hopper" });
    renderWithQuery(<GuideOnboardingForm />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue("Grace");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("Hopper");

    // Prefill uses setValue without shouldDirty → Cancel must NOT confirm
    // (a pristine form leaves immediately). Clicking Cancel navigates straight away.
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText(/discard your progress/i)).not.toBeInTheDocument();
    // isOnboarded (PROVISIONED) → leaves to /dashboard.
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("renders an error alert (the ApiError's message) when the submit mutation rejects with a terminal error", async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValueOnce(
      new ApiError(422, "School email already in use.", "VALIDATION_FAILED"),
    );
    renderWithQuery(<GuideOnboardingForm />);
    await completeAndSubmit(user);

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

  it("[grep-acceptance] no longer imports useSetCurrentRole or useUpdateGuideProfile for the submit path", () => {
    const source = readFileSync(
      join(__dirname, "../../../../src/components/signup/GuideOnboardingForm.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/useSetCurrentRole/);
    expect(source).not.toMatch(/useUpdateGuideProfile/);
    expect(source).toMatch(/useOnboardRole/);
  });
});
