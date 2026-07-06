import { type ReactElement } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GuideProfileForm } from "@/components/profile/GuideProfileForm";
import { ApiError, type GuideProfile } from "@/lib/data-access";

const mutateAsync = jest.fn();

const mockUseTourTopics = jest.fn(() => ({
  data: [{ value: "GENERAL_CAMPUS", label: "General campus" }],
  isLoading: false,
}));

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useUpdateGuideProfile: () => ({ mutateAsync, isPending: false }),
  useTourTopics: () => mockUseTourTopics(),
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
  firstName: "Ada",
  lastName: "Lovelace",
  universityId: "uni-1",
  universityName: "State University",
  major: "Computer Science",
  classYear: "2027",
  bio: "Campus explorer.",
  languages: ["en-US"],
  specialties: ["GENERAL_CAMPUS"],
  basePriceCents: 4200,
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
      basePriceCents: 4200,
    });
    expect(screen.getByText("Profile saved.")).toBeInTheDocument();
  });

  it("rejects out-of-range base prices before submitting", async () => {
    renderWithQuery(<GuideProfileForm profile={profile} />);

    fireEvent.change(screen.getByLabelText(/base price per tour/i), { target: { value: "10" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save profile" }).closest("form")!);

    expect(await screen.findByText("Price must be between $20 and $200")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
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
    renderWithQuery(<GuideProfileForm profile={{ major: "Physics" }} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue("");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("");
    expect(screen.getByLabelText(/major/i)).toHaveValue("Physics");
    expect(screen.getByLabelText(/base price per tour/i)).toHaveValue(28);
    expect(screen.getByText("Pick university")).toBeInTheDocument();
  });

  it("seeds university chip from profile university name", () => {
    renderWithQuery(
      <GuideProfileForm
        profile={{
          universityId: "uni-1",
          universityName: "Stanford University",
          universityShortName: "Stanford",
          major: "CS",
        }}
      />,
    );

    expect(screen.getByText("Stanford")).toBeInTheDocument();
    expect(screen.queryByText("Your university")).not.toBeInTheDocument();
  });

  it("requires a university before submitting", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <GuideProfileForm profile={{ firstName: "Ada", lastName: "Lovelace", major: "Math" }} />,
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
});
