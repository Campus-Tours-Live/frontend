import { type ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GuideOnboardingForm } from "@/components/signup/GuideOnboardingForm";
import { ApiError, type EnrollmentYearRules } from "@/lib/data-access";
import { AuthCancelledError, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";

// These are heavy multi-step flows (esp. the "switch schools" fallback cases); give them headroom
// beyond the default 5s per-test timeout so a loaded CI runner doesn't trip a false timeout.
jest.setTimeout(20000);

// Variants the main suite's fixed mock can't express: empty tour-topics, non-ApiError/ApiError
// rejection variants, an empty base price, and the majors-hook edge cases below.
const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const mutateAsync = jest.fn();
let topicsData: Array<{ value: string; label: string }> | undefined;

// A small catalog keyed by search text, so a test can pick between multiple schools —
// needed to exercise "switch school, old major becomes a fallback option" and
// "majors hook resolves without a `data` field" (both unreachable with a single fixed
// school + always-array majors mock).
const UNIVERSITY_CATALOG: Record<string, { id: string; name: string; shortName?: string }> = {
  state: { id: "u-1", name: "State University", shortName: "State" },
  tech: { id: "u-2", name: "Tech Institute", shortName: "Tech" },
  empty: { id: "u-3", name: "Empty Data University", shortName: "Empty Data" },
  // Majors resolve, degrees don't — isolates the "degrees unavailable" path (no majors retry too).
  nodeg: { id: "u-4", name: "No Degrees University", shortName: "NoDeg" },
};

// Layer 0b: the majors hook's degraded states. Defaults to "settled, no error" so the existing
// suite is unaffected; individual tests flip these.
const refetchMajors = jest.fn();
let majorsState: { isLoading: boolean; isFetching: boolean; isError: boolean } = {
  isLoading: false,
  isFetching: false,
  isError: false,
};

// Same overridable degraded states for the degrees hook (its own retry UI mirrors majors).
const refetchDegrees = jest.fn();
let degreesState: { isLoading: boolean; isFetching: boolean; isError: boolean } = {
  isLoading: false,
  isFetching: false,
  isError: false,
};

const MAJORS_BY_SCHOOL: Record<string, Array<{ value: string; label: string }> | undefined> = {
  "u-1": [{ value: "computer_science", label: "Computer Science" }],
  "u-2": [{ value: "economics", label: "Economics" }],
  // Simulates the hook resolving without a `data` field (e.g. still settling) —
  // exercises the `{ data: majorOptions = [] }` default.
  "u-3": undefined,
  "u-4": [{ value: "computer_science", label: "Computer Science" }],
};

// Degrees per school — a different set on u-2 so the "fallback option after switching" path is
// reachable, and undefined on u-4 to exercise the `{ data: degreeOptions = [] }` default (u-3 keeps
// real degrees so the majors-only "empty list" test still sees a single retry button).
const DEGREES_BY_SCHOOL: Record<string, Array<{ value: string; label: string }> | undefined> = {
  "u-1": [{ value: "Bachelor's Degree", label: "Bachelor's Degree" }],
  "u-2": [{ value: "Master's Degree", label: "Master's Degree" }],
  "u-3": [{ value: "Bachelor's Degree", label: "Bachelor's Degree" }],
  "u-4": undefined,
};

// The server's enrolment-year rules (CTL-97). Mocked at the same data-access boundary as the
// hooks below — otherwise the form's query would hit the network from these tests. A stable
// module-level const: `useEnrollmentYearFields` keys an effect on the rules object.
const YEAR_RULES: EnrollmentYearRules = {
  entryYear: { min: 2016, max: 2027 },
  maxYearsToGraduate: [
    { matches: ["doctor", "first professional"], years: 9 },
    { matches: ["master", "post-baccalaureate"], years: 3 },
    { matches: ["bachelor"], years: 6 },
    { matches: ["associate", "certificate", "diploma"], years: 3 },
  ],
  defaultMaxYearsToGraduate: 8,
};
const refetchRules = jest.fn();

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useMe: () => ({ me: null, isLoading: false, isOnboarded: false, hasRole: () => false }),
  useEnrollmentYears: () => ({
    data: YEAR_RULES,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: refetchRules,
  }),
  useTourTopics: () => ({ data: topicsData }),
  useOnboardRole: () => ({ mutateAsync, isPending: false }),
  // Majors are keyed off the selected school — empty until one is picked, matching
  // the real hook's `enabled: Boolean(schoolId)` gate. The loading/error flags are
  // overridable so the degraded states can be driven per test.
  useMajors: (schoolId?: string | null) => ({
    data: schoolId ? MAJORS_BY_SCHOOL[schoolId] : [],
    isLoading: majorsState.isLoading,
    isFetching: majorsState.isFetching,
    isError: majorsState.isError,
    refetch: refetchMajors,
  }),
  useDegrees: (schoolId?: string | null) => ({
    data: schoolId ? DEGREES_BY_SCHOOL[schoolId] : [],
    isLoading: degreesState.isLoading,
    isFetching: degreesState.isFetching,
    isError: degreesState.isError,
    refetch: refetchDegrees,
  }),
  useUniversitySearch: (query: string, opts?: { enabled?: boolean }) => {
    const match = UNIVERSITY_CATALOG[query.trim().toLowerCase()];
    return {
      data: opts?.enabled === false ? [] : match ? [match] : [],
      isFetching: false,
    };
  },
}));

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

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
  await user.click(await screen.findByRole("combobox", { name: /degree/i }));
  await user.click(await screen.findByRole("option", { name: "Bachelor's Degree" }));
  // Entry year is REQUIRED now (CTL-97) — 2023 sits inside the fixture's 2016–2027 window.
  await user.type(screen.getByLabelText(/entry year/i), "2023");
}

/** On step 2 ("Your guiding"), fill the now-required bio and pick a specialty. */
async function completeStepTwo(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    await screen.findByLabelText(/short bio/i),
    "I love showing students the maker space, dorms, and the best study spots on campus.",
  );
  await user.click(screen.getByRole("checkbox", { name: /Academics/i }));
}

async function completeAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await completeStepOne(user);
  await user.click(screen.getByRole("button", { name: /continue/i }));
  await completeStepTwo(user);
  await user.click(await screen.findByRole("button", { name: /continue/i }));
  await user.type(await screen.findByLabelText(/school email address/i), "jordan@university.edu");
  await user.click(screen.getByRole("button", { name: /^submit$/i }));
}

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
  topicsData = [{ value: "academics", label: "Academics" }];
  refetchMajors.mockReset();
  majorsState = { isLoading: false, isFetching: false, isError: false };
  refetchDegrees.mockReset();
  degreesState = { isLoading: false, isFetching: false, isError: false };
  refetchRules.mockReset();
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

  it("attributes a dismissed sign-in prompt to auth, not to onboarding failing", async () => {
    // AuthCancelledError IS an Error, so a naive `err.message` path would show "Sign-in was
    // cancelled." — correctly attributed but unactionable, and worded unlike every other site.
    // Route it through the canonical message, checked FIRST (before the ApiError branches).
    mutateAsync.mockRejectedValueOnce(new AuthCancelledError());
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeAndSubmit(user);

    expect(await screen.findByText(SIGN_IN_AGAIN_MESSAGE)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a generic message for a non-ApiError rejection (Error or otherwise) — never the raw text", async () => {
    // Keyed on the ApiError type, not "is this an Error" — an internal contract-violation Error
    // (e.g. a malformed 201) is just as unactionable to show raw as a bare string throw.
    mutateAsync.mockRejectedValueOnce("boom");
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeAndSubmit(user);

    expect(await screen.findByText(/something went wrong\. please try again/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("keys the parent-not-eligible message on ROLE_NOT_ELIGIBLE + properties.role === GUIDE, not on message text", async () => {
    // Deliberately an unrelated message string — the branch must key on code + properties, never
    // on what the message SAYS.
    mutateAsync.mockRejectedValueOnce(
      new ApiError(409, "conflict", "ROLE_NOT_ELIGIBLE", undefined, { role: "GUIDE" }),
    );
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeAndSubmit(user);

    expect(await screen.findByText(/can.t become guides/i)).toBeInTheDocument();
    expect(screen.queryByText(/^conflict$/i)).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("falls back to the ApiError's own message for ROLE_NOT_ELIGIBLE on a role other than GUIDE", async () => {
    mutateAsync.mockRejectedValueOnce(
      new ApiError(409, "Role already granted elsewhere", "ROLE_NOT_ELIGIBLE", undefined, {
        role: "PARTICIPANT",
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);
    await completeAndSubmit(user);

    expect(await screen.findByText(/role already granted elsewhere/i)).toBeInTheDocument();
    expect(screen.queryByText(/can.t become guides/i)).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("defaults majorOptions to an empty list when useMajors returns no data", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.type(screen.getByPlaceholderText(/search universities/i), "empty");
    await user.click(await screen.findByRole("button", { name: /Empty Data University/i }));

    // useMajors("u-3") resolves to `{}` (no `data`) → majorOptions defaults to [] and the
    // major picker shows only the placeholder, without throwing.
    const majorTrigger = await screen.findByRole("combobox", { name: /major/i });
    expect(majorTrigger).not.toBeDisabled();
    expect(majorTrigger).toHaveAttribute("placeholder", "Select a major");
    await user.click(majorTrigger);
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(await screen.findByText(/no matches/i)).toBeInTheDocument();
  });

  // Layer 0b — major is REQUIRED and its options come from a live upstream. The Core swallows a
  // Scorecard outage into an empty list, so the query SUCCEEDS with `[]`: without these states the
  // dropdown sits permanently empty with no explanation and onboarding dead-ends.
  it("explains an empty majors list and offers a retry", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.type(screen.getByPlaceholderText(/search universities/i), "empty");
    await user.click(await screen.findByRole("button", { name: /Empty Data University/i }));

    expect(await screen.findByText(/couldn't load majors for this school/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetchMajors).toHaveBeenCalledTimes(1);
  });

  it("shows the retry as in-flight so it can't be spam-clicked", async () => {
    // A retry runs against an already-settled query, so `isLoading` stays FALSE (it is
    // `isPending && isFetching`, first-load only). `isFetching` is what makes the retry visible —
    // without it the button sits idle for the whole upstream round trip and invites double-clicks.
    majorsState = { isLoading: false, isFetching: true, isError: false };
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.type(screen.getByPlaceholderText(/search universities/i), "empty");
    await user.click(await screen.findByRole("button", { name: /Empty Data University/i }));

    const retry = await screen.findByRole("button", { name: /trying…/i });
    expect(retry).toBeDisabled();
    // The explanation stays put rather than flickering out and back.
    expect(screen.getByText(/couldn't load majors for this school/i)).toBeInTheDocument();
  });

  it("explains a failed majors fetch even when the school has options cached", async () => {
    majorsState = { isLoading: false, isFetching: false, isError: true };
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.type(screen.getByPlaceholderText(/search universities/i), "state");
    await user.click(await screen.findByRole("button", { name: /State University/i }));

    expect(await screen.findByText(/couldn't load majors for this school/i)).toBeInTheDocument();
  });

  it("explains a failed degrees fetch and offers a retry", async () => {
    // Degrees error on a school whose majors are fine (u-1), so only the degrees retry shows.
    degreesState = { isLoading: false, isFetching: false, isError: true };
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.type(screen.getByPlaceholderText(/search universities/i), "state");
    await user.click(await screen.findByRole("button", { name: /State University/i }));

    expect(await screen.findByText(/couldn't load degrees for this school/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetchDegrees).toHaveBeenCalledTimes(1);
  });

  it("shows the degrees retry as in-flight so it can't be spam-clicked", async () => {
    degreesState = { isLoading: false, isFetching: true, isError: true };
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.type(screen.getByPlaceholderText(/search universities/i), "state");
    await user.click(await screen.findByRole("button", { name: /State University/i }));

    const retry = await screen.findByRole("button", { name: /trying…/i });
    expect(retry).toBeDisabled();
    expect(screen.getByText(/couldn't load degrees for this school/i)).toBeInTheDocument();
  });

  it("defaults degreeOptions to an empty list when useDegrees returns no data", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.type(screen.getByPlaceholderText(/search universities/i), "nodeg");
    await user.click(await screen.findByRole("button", { name: /No Degrees University/i }));

    // useDegrees("u-4") resolves to `{}` (no `data`) → degreeOptions defaults to [] without throwing.
    const degreeTrigger = await screen.findByRole("combobox", { name: /degree/i });
    expect(degreeTrigger).not.toBeDisabled();
    expect(degreeTrigger).toHaveAttribute("placeholder", "Select a degree");
    await user.click(degreeTrigger);
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("shows a loading placeholder on the degree select while degrees load", async () => {
    degreesState = { isLoading: true, isFetching: true, isError: false };
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.type(screen.getByPlaceholderText(/search universities/i), "state");
    await user.click(await screen.findByRole("button", { name: /State University/i }));

    const degreeTrigger = await screen.findByRole("combobox", { name: /degree/i });
    expect(degreeTrigger).toBeDisabled();
    expect(degreeTrigger).toHaveAttribute("placeholder", "Loading degrees…");
  });

  it("disables the major select while majors are loading, without claiming failure", async () => {
    majorsState = { isLoading: true, isFetching: true, isError: false };
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.type(screen.getByPlaceholderText(/search universities/i), "state");
    await user.click(await screen.findByRole("button", { name: /State University/i }));

    const majorTrigger = await screen.findByRole("combobox", { name: /major/i });
    expect(majorTrigger).toBeDisabled();
    expect(majorTrigger).toHaveAttribute("placeholder", "Loading majors…");
    // Still in flight — must not accuse the upstream of failing yet.
    expect(screen.queryByText(/couldn't load majors/i)).not.toBeInTheDocument();
  });

  it("says nothing about majors before a university is chosen", () => {
    renderWithQuery(<GuideOnboardingForm />);

    expect(screen.getByLabelText(/major/i)).toBeDisabled();
    expect(screen.queryByText(/couldn't load majors/i)).not.toBeInTheDocument();
  });

  it("keeps previously chosen major & degree as fallback options after switching schools", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    // Drive the university search with fireEvent.change (one shot) rather than a per-character
    // user.type: at max=1 the search input unmounts once a school is selected and remounts fresh
    // after removal, and typing char-by-char into a just-remounted controlled input drops
    // keystrokes on a slow single-core CI runner — leaving the query unsearched and the school
    // never offered. Setting the value in a single change event sidesteps that race entirely.
    fireEvent.change(screen.getByPlaceholderText(/search universities/i), {
      target: { value: "state" },
    });
    await user.click(await screen.findByRole("button", { name: /State University/i }));
    // Pick a major AND a degree on the first school (SelectMenu: open, then choose).
    await user.click(await screen.findByRole("combobox", { name: /major/i }));
    await user.click(await screen.findByRole("option", { name: "Computer Science" }));
    await user.click(await screen.findByRole("combobox", { name: /degree/i }));
    await user.click(await screen.findByRole("option", { name: "Bachelor's Degree" }));

    // Switch schools — the major/degree fields keep their old values, but the new school's
    // lists ("economics" / "Master's Degree") no longer contain them. (max=1 → the combobox's
    // "Change university" control clears the selection and brings the search back.)
    await user.click(screen.getByRole("button", { name: /change university/i }));
    // The input has remounted empty below max; set "tech" in one change event (see above).
    fireEvent.change(await screen.findByPlaceholderText(/search universities/i), {
      target: { value: "tech" },
    });
    await user.click(await screen.findByRole("button", { name: /Tech Institute/i }));

    // The switch has settled. The major picker keeps the old value as its label (fallback), and
    // opening it offers both the new school's option and that fallback.
    // Generous timeouts — the school switch + option render is slow on a loaded CI runner. Wait
    // for the picker to re-enable after the switch before opening it (clicking a still-disabled
    // combobox is a no-op, which is what made this flaky).
    const majorTrigger = await screen.findByRole("combobox", { name: /major/i });
    await waitFor(() => expect(majorTrigger).toBeEnabled(), { timeout: 5000 });
    expect(majorTrigger).toHaveValue("computer_science");
    await user.click(majorTrigger);
    expect(
      await screen.findByRole("option", { name: "Economics" }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "computer_science" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(majorTrigger).toHaveAttribute("aria-expanded", "false"), {
      timeout: 5000,
    });

    // Same fallback behaviour for the degree picker.
    const degreeTrigger = screen.getByRole("combobox", { name: /degree/i });
    await waitFor(() => expect(degreeTrigger).toBeEnabled(), { timeout: 5000 });
    expect(degreeTrigger).toHaveValue("Bachelor's Degree");
    await user.click(degreeTrigger);
    await waitFor(() => expect(degreeTrigger).toHaveAttribute("aria-expanded", "true"), {
      timeout: 5000,
    });
    expect(
      await screen.findByRole("option", { name: "Master's Degree" }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bachelor's Degree" })).toBeInTheDocument();
  });
});
