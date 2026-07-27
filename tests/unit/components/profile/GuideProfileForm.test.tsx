import { type ReactElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GuideProfileForm } from "@/components/profile/GuideProfileForm";
import { ApiError, type GuideProfile } from "@/lib/data-access";

const mutateAsync = jest.fn();

const mockUseTourTopics = jest.fn(() => ({
  data: [{ value: "GENERAL_CAMPUS", label: "General campus" }],
  isLoading: false,
}));

const mockUseMajors = jest.fn((_schoolId?: string | null) => ({
  data: [] as { value: string; label: string }[],
}));

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

const profile: GuideProfile = {
  universities: [
    {
      universityId: "uni-1",
      universityName: "State University",
      universityShortName: null,
      major: "Computer Science",
      classYear: "2027",
      verificationStatus: "VERIFIED",
    },
  ],
  bio: "Campus explorer.",
  languages: ["en-US"],
  specialties: ["GENERAL_CAMPUS"],
};

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
  mockUseMe.mockReturnValue({ me: { user: { firstName: "Ada", lastName: "Lovelace" } } });
});

describe("GuideProfileForm", () => {
  it("saves profile changes without submit", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={profile} />);

    await user.clear(screen.getByLabelText(/first name/i));
    await user.type(screen.getByLabelText(/first name/i), "Grace");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(mutateAsync).toHaveBeenCalledWith({
      firstName: "Grace",
      lastName: "Lovelace",
      universityId: "uni-1",
      major: "Computer Science",
      classYear: "2027",
      bio: "Campus explorer.",
      languages: ["en-US"],
      specialties: ["GENERAL_CAMPUS"],
    });
    expect(screen.getByText("Profile saved.")).toBeInTheDocument();
  });

  it("shows a validation message for 422 responses", async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(new ApiError(422, "Unprocessable"));
    renderWithQuery(<GuideProfileForm profile={profile} />);

    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check your inputs — name, university, and major are required.",
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

    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ languages: ["es"] }));
  });

  it("shows loading copy while tour topics load", () => {
    mockUseTourTopics.mockReturnValue({ data: [], isLoading: true });
    renderWithQuery(<GuideProfileForm profile={profile} />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("toggles specialty chips", async () => {
    const user = userEvent.setup();
    renderWithQuery(<GuideProfileForm profile={{ ...profile, specialties: [] }} />);

    await user.click(screen.getByRole("button", { name: "General campus" }));
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ specialties: ["GENERAL_CAMPUS"] }),
    );

    await user.click(screen.getByRole("button", { name: "General campus" }));
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(mutateAsync).toHaveBeenLastCalledWith(expect.objectContaining({ specialties: [] }));
  });

  it("seeds an empty major when the profile omits one", () => {
    renderWithQuery(<GuideProfileForm profile={{}} />);

    expect(screen.getByLabelText(/major/i)).toHaveValue("");
  });

  it("defaults specialty and major options to empty lists when the hooks return no data", () => {
    mockUseTourTopics.mockReturnValue({ data: undefined, isLoading: false } as never);
    mockUseMajors.mockReturnValue({ data: undefined } as never);
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
