import { render, screen } from "@testing-library/react";
import { GuideProfilePage } from "@/components/profile/GuideProfilePage";
import { useGuideProfile, useMe, type GuideProfile } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useMe: jest.fn(),
  useGuideProfile: jest.fn(),
  useUpdateGuideProfile: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useTourTopics: () => ({
    data: [{ value: "GENERAL_CAMPUS", label: "General campus" }],
    isLoading: false,
  }),
}));

jest.mock("@/components/signup/UniversityMultiSelect", () => ({
  UniversityMultiSelect: ({ value }: { value: Array<{ id: string; name: string }> }) => (
    <div>{value[0]?.name ?? "Pick university"}</div>
  ),
}));

const mockUseMe = useMe as jest.Mock;
const mockUseGuideProfile = useGuideProfile as jest.Mock;

const profile: GuideProfile = {
  userId: "u1",
  firstName: "Ada",
  lastName: "Lovelace",
  displayName: "Ada Lovelace",
  email: "ada@example.com",
  universityId: "uni-1",
  universityName: "State University",
  major: "Computer Science",
  classYear: "2027",
  bio: "Campus explorer.",
  languages: ["en-US"],
  specialties: ["GENERAL_CAMPUS"],
  basePriceCents: 4200,
  currency: "USD",
  applicationStatus: "APPROVED",
  verificationStatus: "VERIFIED",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMe.mockReturnValue({
    me: { createdAt: "2025-03-15T00:00:00Z", activeRole: "GUIDE" },
  });
  mockUseGuideProfile.mockReturnValue({
    data: profile,
    isLoading: false,
    isError: false,
  });
});

describe("GuideProfilePage", () => {
  it("renders a loading state while the profile is loading", () => {
    mockUseGuideProfile.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    render(<GuideProfilePage />);

    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
  });

  it("renders an error alert when the profile fails to load", () => {
    mockUseGuideProfile.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    render(<GuideProfilePage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load your guide profile.");
  });

  it("renders read-only account details and the edit form", () => {
    render(<GuideProfilePage />);

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("March 2025")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Ada");
    expect(screen.getByRole("button", { name: "Save profile" })).toBeInTheDocument();
  });

  it("falls back to em dashes when display name and email are missing", () => {
    mockUseGuideProfile.mockReturnValue({
      data: { ...profile, displayName: undefined, email: undefined },
      isLoading: false,
      isError: false,
    });
    render(<GuideProfilePage />);

    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});
