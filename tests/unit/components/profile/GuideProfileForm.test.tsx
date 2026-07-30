import { type ReactElement, type ReactNode } from "react";
import { act, render, screen, within } from "@testing-library/react";
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
// The rules are a network read: "loading" is the in-flight state every cold load starts in, "ready"
// the already-cached one (the query is fresh for an hour, so a profile page opened after onboarding
// renders with them in hand). Both are reachable at ANY render, which is why the hook gates on the
// rules being present rather than on how many times its effect has run. "errored" is a THIRD state,
// not `!ready`: a settled failure keeps `isLoading` false, and telling it apart from the in-flight
// one is the whole point of the messages the user reads there.
type RulesState = "ready" | "loading" | "errored";
let rulesState: RulesState = "ready";

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
    data: rulesState === "ready" ? YEAR_RULES : undefined,
    isLoading: rulesState === "loading",
    isFetching: rulesState === "loading",
    isError: rulesState === "errored",
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

// A stored entry year that has AGED OUT of the server's window: the window advances every
// 1 January and a saved year does not, so this is every long-serving guide eventually. Derived
// from the fixture rather than written as a literal, so revising the window above cannot quietly
// stop this case being aged out.
const AGED_OUT_ENTRY_YEAR = YEAR_RULES.entryYear.min - 2;
// Its class year is still derived from the entry year exactly as ever — bachelor's is +6, so
// 2015–2020 here, entirely in the past and entirely correct.
const agedOut = enrolled(AGED_OUT_ENTRY_YEAR, String(AGED_OUT_ENTRY_YEAR + 4));

// The provider goes in as a `wrapper` rather than around `ui`, so the returned `rerender` re-runs
// the form inside the SAME client — which is how a test re-renders after flipping `rulesReady`.
function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper });
}

beforeEach(() => {
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(profile);
  rulesState = "ready";
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

  it("renders entry year before class year, prefilled from the profile", async () => {
    renderWithQuery(<GuideProfileForm profile={profile} />);

    // `findBy` rather than `getBy`: a seeded class year makes the shared effect re-validate on
    // mount, and that resolves a tick later — awaiting a settle point keeps the update inside act.
    expect(await screen.findByLabelText(/entry year/i)).toHaveValue("2023");
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
    // Pinned, because both assertions above are also satisfied by the BROWSER: `clear()` blurs the
    // field (setting react-hook-form's message) on its way to the button, and a form without
    // `novalidate` never fires `submit` at all when a `required` input is empty. Without this line
    // the test passes for a reason it does not name — see the untouched-field test below.
    expect(screen.getByLabelText(/entry year/i).closest("form")).toHaveAttribute("novalidate");
  });

  /**
   * The same block, reached WITHOUT ever touching the field — no clear, no blur, no `trigger`.
   * Entry year carries the DOM `required` attribute (that is what tells assistive tech it is
   * required), so a form missing `noValidate` fails interactive validation and the `submit` event
   * is never fired: `handleSubmit` never runs, nothing is validated, nothing is sent, and the user
   * gets a Save button that does nothing and says nothing.
   */
  it("reports an untouched empty entry year instead of silently doing nothing", async () => {
    const user = userEvent.setup();
    // entryYear is NOT NULL on the wire, but `toFormValues` reads it defensively — this is the
    // empty box the reviewer reproduced, with every other field seeded and valid.
    renderWithQuery(
      <GuideProfileForm
        profile={{
          ...profile,
          universities: [{ ...university, entryYear: undefined as unknown as number }],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText(/please enter your entry year/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  /**
   * The COLD path. This form seeds all three year inputs from the saved profile, so the shared
   * re-validate effect has something to judge from the very first render — but with the rules
   * still in flight `validateClassYear` can only answer "Enter your entry year first.", which as
   * an ERROR would sit under a class year whose entry year is filled in right beside it. Nothing
   * is flagged until the rules land; then the real window applies.
   */
  it("waits for the year rules before flagging a seeded class year", async () => {
    const user = userEvent.setup();
    // One profile object across both renders: a new identity would re-run the form's `reset`
    // effect, which clears errors and would mask what this test is watching for.
    const seeded = enrolled(2020, "2030");
    rulesState = "loading";
    const { rerender } = renderWithQuery(<GuideProfileForm profile={seeded} />);

    // No field error anywhere — `field-error` is the only thing on this form with role="alert"
    // until a save fails, so this covers the misleading message specifically.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // The rules can still be missing on a LATER run: degree is gated on the university, not on the
    // rules request, so it is editable throughout the load. Changing it re-runs the effect.
    await user.selectOptions(screen.getByLabelText(/degree/i), "Master's Degree");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rulesState = "ready";
    rerender(<GuideProfileForm profile={seeded} />);

    // 2030 is outside the master's window (2021–2023), and now there are rules to say so.
    expect(await screen.findByText(/graduation year between 2021 and 2023/i)).toBeInTheDocument();
  });

  /**
   * The WARM path — same data, same screen, same answer. The rules query is fresh for an hour, so
   * a profile page opened after onboarding renders with them already in hand and the effect's
   * first run is the one that judges. Keying the guard on the rules rather than on a run count is
   * what keeps this in step with the cold path above.
   */
  it("flags a seeded class year immediately when the rules are already cached", async () => {
    renderWithQuery(<GuideProfileForm profile={enrolled(2020, "2030")} />);

    expect(await screen.findByText(/graduation year between 2021 and 2026/i)).toBeInTheDocument();
  });

  /**
   * The stored value is EXEMPT from the entry-year window. The window advances every 1 January and
   * a stored year does not, so a guide who enrolled long enough ago was being told a true fact was
   * invalid — with class year greyed out beside it, which is what stopped them ever reaching Save.
   * The class-year window is still derived from the entry year, unchanged: in the past, and right.
   */
  it("accepts a stored entry year that has aged out, and leaves class year usable", async () => {
    renderWithQuery(<GuideProfileForm profile={agedOut} />);

    expect(await screen.findByLabelText(/entry year/i)).toHaveValue(String(AGED_OUT_ENTRY_YEAR));
    // The seeded class year makes the shared re-validate effect run on mount, and it resolves a
    // tick later — flushing it is what makes the "nothing is flagged" assertion below mean
    // anything, since before this fix that run is where "Enter your entry year first." came from.
    await act(async () => {});
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/class year/i)).toBeEnabled();
    expect(
      screen.getByText(
        new RegExp(
          `Expected graduation .* ${AGED_OUT_ENTRY_YEAR + 1} to ${AGED_OUT_ENTRY_YEAR + 6}\\.`,
        ),
      ),
    ).toBeInTheDocument();
  });

  /** …and the point of all that: an edit to some OTHER field now actually saves. */
  it("saves an edit elsewhere on a profile whose entry year has aged out", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={agedOut} />);

    await user.clear(await screen.findByLabelText(/short bio/i));
    await user.type(screen.getByLabelText(/short bio/i), "Still guiding.");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ entryYear: AGED_OUT_ENTRY_YEAR, bio: "Still guiding." }),
    );
  });

  /**
   * The exemption is for the value the SERVER returned, not for "anything below the window" — a
   * CHANGED value is checked against the live window exactly as before, so nobody can newly set an
   * aged-out year from here.
   */
  it("still rejects an entry year edited to a different out-of-window value", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={agedOut} />);

    await user.clear(await screen.findByLabelText(/entry year/i));
    await user.type(screen.getByLabelText(/entry year/i), String(AGED_OUT_ENTRY_YEAR - 1));
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    const { min, max } = YEAR_RULES.entryYear;
    expect(
      await screen.findByText(`Enter an entry year between ${min} and ${max}.`),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("accepts an edit that moves an aged-out entry year into the window", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={agedOut} />);

    await user.clear(await screen.findByLabelText(/entry year/i));
    await user.type(screen.getByLabelText(/entry year/i), String(YEAR_RULES.entryYear.min));
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ entryYear: YEAR_RULES.entryYear.min }),
    );
  });

  /**
   * A rules OUTAGE on a fully seeded profile. Both messages the guide used to get here were
   * untrue: one said the rules were "still loading" (they had failed), the other told them to
   * enter an entry year that reads 2023 right beside it — a value that came from the server.
   */
  it("names the failure and flags only the field with a real problem when the rules fail", async () => {
    const user = userEvent.setup();
    rulesState = "errored";
    renderWithQuery(<GuideProfileForm profile={profile} />);

    // Announced on arrival — the only explanation for a required field being disabled.
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load the year rules.");

    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(
      await screen.findByText("We couldn't load the year rules — select Try again below."),
    ).toBeInTheDocument();
    // Not a word about entry year under class year: nothing there is the guide's to fix.
    expect(screen.queryByText(/enter your entry year first/i)).not.toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  /**
   * The backend has required degree since CTL-96, so a profile stored before that — with no degree
   * at all — cannot save until the guide picks one. That is the intended consequence of sending it
   * unconditionally, and it is a real population, so it gets a test.
   */
  it("blocks saving a profile that has no degree yet", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <GuideProfileForm
        profile={{ ...profile, universities: [{ ...university, degree: undefined }] }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save profile" }));

    // The same message GuideOnboardingForm shows for the same field.
    expect(await screen.findByText("Please select your degree.")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
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

  it("shows loading copy while tour topics load", async () => {
    mockUseTourTopics.mockReturnValue({ data: [], isLoading: true });
    renderWithQuery(<GuideProfileForm profile={profile} />);

    expect(await screen.findByText("Loading…")).toBeInTheDocument();
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

  it("defaults specialty and major options to empty lists when the hooks return no data", async () => {
    mockUseTourTopics.mockReturnValue({ data: undefined, isLoading: false } as never);
    mockUseMajors.mockReturnValue({ data: undefined } as never);
    mockUseDegrees.mockReturnValue({ data: undefined } as never);
    renderWithQuery(<GuideProfileForm profile={profile} />);

    // majorOptions defaults to [] → only the saved-major fallback option is present.
    const majorSelect = await screen.findByLabelText(/major/i);

    // topicOptions defaults to [] → no specialty chips rendered (and not the loading copy).
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "General campus" })).not.toBeInTheDocument();

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
