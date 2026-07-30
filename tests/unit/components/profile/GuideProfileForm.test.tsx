import { type ReactElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GuideProfileForm } from "@/components/profile/GuideProfileForm";
import {
  ApiError,
  type EnrollmentYearRules,
  type GuideProfile,
  type GuideUniversity,
} from "@/lib/data-access";

const mutateAsync = jest.fn();

const mockUseTourTopics = jest.fn(() => ({
  data: [{ value: "GENERAL_CAMPUS", label: "General campus" }],
  isLoading: false,
}));

const mockUseMajors = jest.fn((_schoolId?: string | null) => ({
  data: [] as { value: string; label: string }[],
}));

// Degree levels the school awards — the same live source the onboarding form uses. Two levels with
// DIFFERENT class-year ceilings (bachelor +6, master +3), so switching degree visibly moves the
// graduation window.
const mockUseDegrees = jest.fn((_schoolId?: string | null) => ({
  data: [
    { value: "Bachelor's Degree", label: "Bachelor's Degree" },
    { value: "Master's Degree", label: "Master's Degree" },
  ] as { value: string; label: string }[],
}));

// The enrolment-year rules (CTL-97) live on the SERVER, so they are mocked at the same data-access
// boundary as the hooks above and every year assertion below is a literal. Module-level const:
// `useEnrollmentYearFields` keys an effect on the rules object, so a fresh object per render would
// re-run it on every keystroke.
const YEAR_RULES: EnrollmentYearRules = {
  entryYear: { min: 2016, max: 2027 },
  maxYearsToGraduate: [
    { matches: ["master", "post-baccalaureate"], years: 3 },
    { matches: ["bachelor"], years: 6 },
  ],
  defaultMaxYearsToGraduate: 8,
};

// firstName/lastName are identity fields — no longer part of GuideProfile (Profile Contract
// v2), so the form sources its name defaults from useMe().user instead of the `profile` prop.
const mockUseMe = jest.fn(() => ({
  me: {
    user: { firstName: "Ada", lastName: "Lovelace" } as {
      firstName: string | null;
      lastName: string | null;
    },
  },
}));

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useUpdateGuideProfile: () => ({ mutateAsync, isPending: false }),
  useTourTopics: () => mockUseTourTopics(),
  useMajors: (schoolId: string | null | undefined) => mockUseMajors(schoolId),
  useDegrees: (schoolId: string | null | undefined) => mockUseDegrees(schoolId),
  useEnrollmentYears: () => ({
    data: YEAR_RULES,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useMe: () => mockUseMe(),
}));

jest.mock("@/components/signup/UniversityMultiSelect", () => ({
  UniversityMultiSelect: ({
    value,
    onChange,
  }: {
    value: Array<{ id: string; name: string; shortName?: string | null }>;
    onChange: (next: Array<{ id: string; name: string; shortName?: string | null }>) => void;
  }) => (
    <>
      <button type="button" onClick={() => onChange([{ id: "uni-1", name: "State University" }])}>
        {value.length && value[0] ? value[0].shortName || value[0].name : "Pick university"}
      </button>
      <button type="button" onClick={() => onChange([])}>
        Clear university
      </button>
      <button
        type="button"
        onClick={() => onChange([null as unknown as { id: string; name: string }])}
      >
        Set invalid university
      </button>
    </>
  ),
}));

const university: GuideUniversity = {
  universityId: "uni-1",
  universityName: "State University",
  universityShortName: null,
  major: "Computer Science",
  degree: "Bachelor's Degree",
  classYear: "2027",
  entryYear: 2023,
  verificationStatus: "VERIFIED",
};

const profile: GuideProfile = {
  universities: [university],
  bio: "Campus explorer.",
  spokenLanguages: ["en-US"],
  tourTopics: ["GENERAL_CAMPUS"],
};

/** The fixture profile re-enrolled — for asserting the class-year window at another entry year. */
const enrolled = (entryYear: number, classYear: string): GuideProfile => ({
  ...profile,
  universities: [{ ...university, entryYear, classYear }],
});

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(profile);
  mockUseTourTopics.mockReturnValue({
    data: [{ value: "GENERAL_CAMPUS", label: "General campus" }],
    isLoading: false,
  });
  mockUseMajors.mockReturnValue({ data: [] });
  mockUseDegrees.mockReturnValue({
    data: [
      { value: "Bachelor's Degree", label: "Bachelor's Degree" },
      { value: "Master's Degree", label: "Master's Degree" },
    ],
  });
  mockUseMe.mockReturnValue({ me: { user: { firstName: "Ada", lastName: "Lovelace" } } });
});

describe("GuideProfileForm", () => {
  it("saves profile changes without submit", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={profile} />);

    await user.clear(screen.getByLabelText(/first name/i));
    await user.type(screen.getByLabelText(/first name/i), "Grace");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    // The ONE place that states what a save sends. `degree` and `entryYear` are pinned here
    // because the backend REQUIRES both (degree since CTL-96, entryYear since CTL-97) — the form
    // never sent degree, so every save 422'd, and this exact-match assertion is what stops either
    // being dropped again.
    expect(mutateAsync).toHaveBeenCalledWith({
      firstName: "Grace",
      lastName: "Lovelace",
      universityId: "uni-1",
      major: "Computer Science",
      degree: "Bachelor's Degree",
      classYear: "2027",
      entryYear: 2023,
      bio: "Campus explorer.",
      spokenLanguages: ["en-US"],
      tourTopics: ["GENERAL_CAMPUS"],
    });
    expect(screen.getByText("Profile saved.")).toBeInTheDocument();
  });

  it("renders entry year before class year, prefilled from the profile", () => {
    renderWithQuery(<GuideProfileForm profile={profile} />);

    expect(screen.getByLabelText(/entry year/i)).toHaveValue("2023");
    // Class year's window is derived from entry year, so asking for the derived value first is
    // what made the old rule feel arbitrary — the shared component fixes the order for both forms.
    const labels = screen.getAllByText(/Entry year|Class year/).map((el) => el.textContent);
    expect(labels[0]).toMatch(/Entry year/);
  });

  it("submits a corrected entry year", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={profile} />);

    await user.clear(screen.getByLabelText(/entry year/i));
    await user.type(screen.getByLabelText(/entry year/i), "2024");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ entryYear: 2024 }));
  });

  /**
   * Clearing the box and saving must NOT look like success. `entryYear: undefined` means "leave
   * alone" on the wire, so a conditional `values.entryYear ? Number(...) : undefined` would send
   * nothing, the server would keep the old value, and the form would close as though the edit
   * applied. Required-then-unconditional is what makes that unreachable.
   */
  it("does not treat a cleared entry year as no change", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={profile} />);

    await user.clear(screen.getByLabelText(/entry year/i));
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText(/please enter your entry year/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  /**
   * The shared re-validate effect skips its FIRST run. This form seeds all three year inputs from
   * the saved profile, and in the real app the rules have not arrived on that run — the class-year
   * validator can only answer "Enter your entry year first." then, which would paint a red error
   * under a disabled field on page load, beside a filled-in entry year.
   */
  it("does not judge a seeded class year on the first render", () => {
    // 2030 is outside the bachelor's window (2021–2026) — still nothing on screen until an input
    // to the window actually moves.
    renderWithQuery(<GuideProfileForm profile={enrolled(2020, "2030")} />);

    expect(screen.queryByText(/graduation year between/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/enter your entry year first/i)).not.toBeInTheDocument();
  });

  /** degree is an input to classYear's ceiling here too — same reactive wiring as onboarding. */
  it("recomputes the class-year window when degree changes", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={enrolled(2020, "2026")} />);

    expect(screen.getByText(/Expected graduation .* 2021 to 2026\./)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/degree/i), "Master's Degree");

    // 2020 + 1 .. 2020 + 3 — and the already-typed 2026 is re-validated against the new window.
    expect(await screen.findByText(/Expected graduation .* 2021 to 2023\./)).toBeInTheDocument();
    expect(screen.getByText(/graduation year between 2021 and 2023/i)).toBeInTheDocument();
  });

  it("shows a validation message for 422 responses", async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(new ApiError(422, "Unprocessable"));
    renderWithQuery(<GuideProfileForm profile={profile} />);

    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check your inputs — name, university, major, and entry year are required.",
    );
  });

  it("shows a generic message for non-422 errors", async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(new ApiError(500, "Server error"));
    renderWithQuery(<GuideProfileForm profile={profile} />);

    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not save your profile. Please try again.",
    );
  });

  it("seeds empty defaults when profile fields are missing", () => {
    mockUseMe.mockReturnValue({ me: { user: { firstName: null, lastName: null } } });
    renderWithQuery(
      <GuideProfileForm
        profile={{
          universities: [
            {
              universityId: "",
              universityName: null,
              universityShortName: null,
              major: "Physics",
              entryYear: 2024,
              verificationStatus: "NOT_SUBMITTED",
            },
          ],
        }}
      />,
    );

    expect(screen.getByLabelText(/first name/i)).toHaveValue("");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("");
    expect(screen.getByLabelText(/major/i)).toHaveValue("Physics");
    expect(screen.getByText("Pick university")).toBeInTheDocument();
  });

  it("seeds university chip from profile university name", () => {
    renderWithQuery(
      <GuideProfileForm
        profile={{
          universities: [
            {
              universityId: "uni-1",
              universityName: "Stanford University",
              universityShortName: "Stanford",
              major: "CS",
              entryYear: 2022,
              verificationStatus: "VERIFIED",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Stanford")).toBeInTheDocument();
    expect(screen.queryByText("Your university")).not.toBeInTheDocument();
  });

  it("requires a university before submitting", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <GuideProfileForm
        profile={{
          universities: [
            {
              universityId: "",
              universityName: null,
              universityShortName: null,
              major: "Math",
              entryYear: 2024,
              verificationStatus: "NOT_SUBMITTED",
            },
          ],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("University is required")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("rejects an invalid university selection before calling the API", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={profile} />);

    await user.click(screen.getByRole("button", { name: "Set invalid university" }));
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("University is required")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("omits blank optional fields when saving", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={profile} />);

    await user.click(screen.getByRole("button", { name: "Clear university" }));
    await user.click(screen.getByRole("button", { name: "Pick university" }));
    await user.clear(screen.getByLabelText(/class year/i));
    await user.clear(screen.getByLabelText(/short bio/i));
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        classYear: undefined,
        bio: undefined,
      }),
    );
  });

  it("toggles language chips", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={profile} />);

    await user.click(screen.getByRole("button", { name: "Spanish" }));
    await user.click(screen.getByRole("button", { name: "English" }));
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ spokenLanguages: ["es"] }));
  });

  it("shows loading copy while tour topics load", () => {
    mockUseTourTopics.mockReturnValue({ data: [], isLoading: true });
    renderWithQuery(<GuideProfileForm profile={profile} />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("toggles specialty chips", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={{ ...profile, tourTopics: [] }} />);

    await user.click(screen.getByRole("button", { name: "General campus" }));
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ tourTopics: ["GENERAL_CAMPUS"] }),
    );

    await user.click(screen.getByRole("button", { name: "General campus" }));
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(mutateAsync).toHaveBeenLastCalledWith(expect.objectContaining({ tourTopics: [] }));
  });

  it("seeds an empty major when the profile omits one", () => {
    renderWithQuery(<GuideProfileForm profile={{}} />);

    expect(screen.getByLabelText(/major/i)).toHaveValue("");
  });

  it("defaults specialty and major options to empty lists when the hooks return no data", () => {
    mockUseTourTopics.mockReturnValue({ data: undefined, isLoading: false } as never);
    mockUseMajors.mockReturnValue({ data: undefined } as never);
    mockUseDegrees.mockReturnValue({ data: undefined } as never);
    renderWithQuery(<GuideProfileForm profile={profile} />);

    // topicOptions defaults to [] → no specialty chips rendered (and not the loading copy).
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "General campus" })).not.toBeInTheDocument();

    // majorOptions defaults to [] → only the saved-major fallback option is present.
    const majorSelect = screen.getByLabelText(/major/i);
    expect(within(majorSelect).getAllByRole("option")).toHaveLength(2);
    expect(
      within(majorSelect).getByRole("option", { name: "Computer Science" }),
    ).toBeInTheDocument();

    // Same for degree — the saved value survives an unavailable list, so editing another field
    // can never blank a field the server requires.
    const degreeSelect = screen.getByLabelText(/degree/i);
    expect(within(degreeSelect).getAllByRole("option")).toHaveLength(2);
    expect(
      within(degreeSelect).getByRole("option", { name: "Bachelor's Degree" }),
    ).toBeInTheDocument();
  });

  it("falls back to the saved major option when the live majors list doesn't include it", async () => {
    mockUseMajors.mockReturnValue({ data: [{ value: "BIOLOGY", label: "Biology" }] });
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={profile} />);

    const majorSelect = screen.getByLabelText(/major/i);
    // The saved major ("Computer Science") isn't in the live list, so it's preserved as an option.
    expect(
      within(majorSelect).getByRole("option", { name: "Computer Science" }),
    ).toBeInTheDocument();
    expect(within(majorSelect).getByRole("option", { name: "Biology" })).toBeInTheDocument();

    await user.selectOptions(majorSelect, "BIOLOGY");

    // Once the selected major matches a live option, the fallback duplicate disappears.
    expect(
      within(majorSelect).queryByRole("option", { name: "Computer Science" }),
    ).not.toBeInTheDocument();
  });
});
