import { type ReactElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GuideOnboardingForm } from "@/components/signup/GuideOnboardingForm";

// Variants the main suite's fixed mock can't express: empty tour-topics, a
// non-Error rejection, an empty base price, and the majors-hook edge cases below.
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
};

const MAJORS_BY_SCHOOL: Record<string, Array<{ value: string; label: string }> | undefined> = {
  "u-1": [{ value: "computer_science", label: "Computer Science" }],
  "u-2": [{ value: "economics", label: "Economics" }],
  // Simulates the hook resolving without a `data` field (e.g. still settling) —
  // exercises the `{ data: majorOptions = [] }` default.
  "u-3": undefined,
};

jest.mock("@/lib/data-access", () => ({
  useMe: () => ({ me: null, isLoading: false, isOnboarded: false, hasRole: () => false }),
  useTourTopics: () => ({ data: topicsData }),
  useUpdateGuideProfile: () => ({ mutateAsync }),
  // Majors are keyed off the selected school — empty until one is picked, matching
  // the real hook's `enabled: Boolean(schoolId)` gate.
  useMajors: (schoolId?: string | null) => ({
    data: schoolId ? MAJORS_BY_SCHOOL[schoolId] : [],
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
  await user.selectOptions(await screen.findByLabelText(/major/i), "computer_science");
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

  it("defaults majorOptions to an empty list when useMajors returns no data", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.type(screen.getByPlaceholderText(/search universities/i), "empty");
    await user.click(await screen.findByRole("button", { name: /Empty Data University/i }));

    // useMajors("u-3") resolves to `{}` (no `data`) → majorOptions defaults to [] and the
    // major select shows only the placeholder, without throwing.
    const majorSelect = await screen.findByLabelText(/major/i);
    expect(majorSelect).not.toBeDisabled();
    expect(within(majorSelect).getAllByRole("option")).toHaveLength(1);
    expect(within(majorSelect).getByRole("option", { name: "Select a major" })).toBeInTheDocument();
  });

  it("keeps a previously chosen major as a fallback option after switching schools", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideOnboardingForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Lee");
    await user.type(screen.getByPlaceholderText(/search universities/i), "state");
    await user.click(await screen.findByRole("button", { name: /State University/i }));
    await user.selectOptions(await screen.findByLabelText(/major/i), "computer_science");

    // Switch schools — the major field keeps its old value, but the new school's
    // majors list ("economics") no longer contains it.
    await user.click(screen.getByRole("button", { name: /Remove State University/i }));
    await user.type(screen.getByPlaceholderText(/search universities/i), "tech");
    await user.click(await screen.findByRole("button", { name: /Tech Institute/i }));

    const majorSelect = screen.getByLabelText(/major/i);
    expect(majorSelect).toHaveValue("computer_science");
    expect(
      within(majorSelect).getByRole("option", { name: "computer_science" }),
    ).toBeInTheDocument();
    expect(within(majorSelect).getByRole("option", { name: "Economics" })).toBeInTheDocument();
  });
});
