import { type ReactElement } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GuideProfileForm } from "@/components/profile/GuideProfileForm";
import { ApiError, type GuideProfile } from "@/lib/data-access";

const mutateAsync = jest.fn();
jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useUpdateGuideProfile: () => ({ mutateAsync, isPending: false }),
  useTourTopics: () => ({
    data: [{ value: "GENERAL_CAMPUS", label: "General campus" }],
    isLoading: false,
  }),
}));

jest.mock("@/components/signup/UniversityMultiSelect", () => ({
  UniversityMultiSelect: ({
    value,
    onChange,
  }: {
    value: Array<{ id: string; name: string }>;
    onChange: (next: Array<{ id: string; name: string }>) => void;
  }) => (
    <button type="button" onClick={() => onChange([{ id: "uni-1", name: "State University" }])}>
      {value.length ? value[0]!.name : "Pick university"}
    </button>
  ),
}));

const profile: GuideProfile = {
  firstName: "Ada",
  lastName: "Lovelace",
  universityId: "uni-1",
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
});
