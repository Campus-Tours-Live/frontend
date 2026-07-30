import { render, screen } from "@testing-library/react";
import { GuideProfilePage } from "@/components/profile/GuideProfilePage";
import {
  useGuideProfile,
  useMe,
  type EnrollmentYearRules,
  type GuideProfile,
} from "@/lib/data-access";

// Module-level const, not an inline literal: `useEnrollmentYearFields` keys an effect on the rules
// object, so a fresh object per render would re-run it on every render of the edit form.
const YEAR_RULES: EnrollmentYearRules = {
  entryYear: { min: 2016, max: 2027 },
  maxYearsToGraduate: [{ matches: ["bachelor"], years: 6 }],
  defaultMaxYearsToGraduate: 8,
};

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
  // The edit form's degree picker and enrolment-year rules are network hooks too — mocked here for
  // the same reason as the rest: this page test renders without a QueryClientProvider.
  useDegrees: () => ({ data: [], isLoading: false }),
  useEnrollmentYears: () => ({
    data: YEAR_RULES,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: jest.fn(),
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
  universities: [
    {
      universityId: "uni-1",
      universityName: "State University",
      universityShortName: null,
      major: "Computer Science",
      classYear: "2027",
      entryYear: 2023,
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

  // The edit form's shared year fields re-validate the seeded class year on mount, and that
  // settles a tick after render — so the tests that render it await a settle point first, keeping
  // the update inside act(). Only the tests whose profile carries a class year need this.
  it("renders read-only account details and the edit form", async () => {
    render(<GuideProfilePage />);

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("March 2025")).toBeInTheDocument();
    expect(screen.getAllByText("Verified")).toHaveLength(2);
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Ada");
    expect(screen.getByRole("button", { name: "Save profile" })).toBeInTheDocument();
  });

  it("falls back to em dashes when display name and email are missing", async () => {
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

    expect(await screen.findAllByText("—")).toHaveLength(2);
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
  it("defensively shows an em dash for member since when me is not (yet) a PROVISIONED principal", async () => {
    mockUseMe.mockReturnValue({ me: undefined });
    render(<GuideProfilePage />);

    // Name + email + member-since all fall back to the same em dash when there is no principal.
    expect(await screen.findAllByText("—")).toHaveLength(3);
  });
});
