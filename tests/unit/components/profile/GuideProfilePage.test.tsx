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
  useMajors: () => ({ data: [], isLoading: false }),
}));

jest.mock("@/components/signup/UniversityMultiSelect", () => ({
  UniversityMultiSelect: ({ value }: { value: Array<{ id: string; name: string }> }) => (
    <div>{value[0]?.name ?? "Pick university"}</div>
  ),
}));

const mockUseMe = useMe as jest.Mock;
const mockUseGuideProfile = useGuideProfile as jest.Mock;

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
  spokenLanguages: ["en-US"],
  tourTopics: ["GENERAL_CAMPUS"],
  guideStatus: "VERIFIED",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMe.mockReturnValue({
    me: {
      provisioningStatus: "PROVISIONED",
      user: {
        firstName: "Ada",
        lastName: "Lovelace",
        displayName: "Ada Lovelace",
        email: "ada@example.com",
        createdAt: "2025-03-15T00:00:00Z",
      },
      currentRole: "GUIDE",
    },
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
    expect(screen.getAllByText("Verified")).toHaveLength(2);
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Ada");
    expect(screen.getByRole("button", { name: "Save profile" })).toBeInTheDocument();
  });

  it("falls back to em dashes when display name and email are missing", () => {
    mockUseMe.mockReturnValue({
      me: {
        provisioningStatus: "PROVISIONED",
        user: {
          firstName: null,
          lastName: null,
          displayName: null,
          email: null,
          createdAt: "2025-03-15T00:00:00Z",
        },
        currentRole: "GUIDE",
      },
    });
    render(<GuideProfilePage />);

    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("falls back to an em dash for verification when the guide has no universities yet", () => {
    mockUseGuideProfile.mockReturnValue({
      data: { ...profile, universities: [] },
      isLoading: false,
      isError: false,
    });
    render(<GuideProfilePage />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  /**
   * `createdAt` (CTL-97) only exists on `ProvisionedUser` — `PendingUser` genuinely has no such
   * field on the wire (bff `PendingUserInfo`). This route only renders once `currentRole ===
   * "GUIDE"` (itself only reachable once PROVISIONED), but the component defensively narrows
   * `me.provisioningStatus` before reading `user.createdAt` rather than assuming the caller already
   * did. Pin BOTH branches of that narrowing guard.
   */
  it("defensively shows an em dash for member since when me is not (yet) a PROVISIONED principal", () => {
    mockUseMe.mockReturnValue({ me: undefined });
    render(<GuideProfilePage />);

    // Name + email + member-since all fall back to the same em dash when there is no principal.
    expect(screen.getAllByText("—")).toHaveLength(3);
  });
});
