import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuideVerificationPage } from "@/components/verification/GuideVerificationPage";
import { useGuideProfile } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({ useGuideProfile: jest.fn() }));

const refetch = jest.fn();
function setup(data: unknown, overrides = {}) {
  (useGuideProfile as jest.Mock).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch,
    ...overrides,
  });
}

beforeEach(() => jest.clearAllMocks());

it("shows loading without claiming the guide is verified", () => {
  setup(undefined, { isLoading: true, isFetching: true });
  render(<GuideVerificationPage />);
  expect(screen.getByText("Loading verification status…")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Refreshing…" })).toBeDisabled();
  expect(screen.queryByRole("region", { name: "Guide application" })).not.toBeInTheDocument();
});

it.each([undefined, { guideStatus: "VERIFIED" }])(
  "offers refresh on errors, hiding stale status (%j)",
  async (data) => {
    setup(data, { isError: true, error: new Error("Unavailable") });
    render(<GuideVerificationPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load your verification status");
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Refresh status" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  },
);

it("handles a missing profile as unavailable", () => {
  setup(undefined);
  render(<GuideVerificationPage />);
  expect(screen.getByRole("alert")).toHaveTextContent("Could not load your verification status");
});

it.each([
  ["PENDING", "Pending verification", "Your guide verification is pending"],
  ["REJECTED", "Rejected", "Your guide verification was not approved"],
  [null, "Status unavailable", "Your application status is not available yet"],
  ["UNKNOWN", "Status unavailable", "Your application status is not available yet"],
])("shows truthful application guidance for %s", (guideStatus, label, copy) => {
  setup({ guideStatus, universities: [] });
  render(<GuideVerificationPage />);
  const application = within(screen.getByRole("region", { name: "Guide application" }));
  expect(application.getByText(label)).toBeInTheDocument();
  expect(application.getByText(new RegExp(copy))).toBeInTheDocument();
  expect(application.getByRole("link", { name: "Review profile" })).toHaveAttribute(
    "href",
    "/profile",
  );
  expect(screen.queryByRole("link", { name: "Manage offerings" })).not.toBeInTheDocument();
});

it("shows each university's independent status and verified guide next steps", () => {
  setup({
    guideStatus: "VERIFIED",
    universities: [
      {
        universityId: "u1",
        universityName: "North Coast University",
        verificationStatus: "VERIFIED",
      },
      { universityId: "u2", universityName: "City College", verificationStatus: "PENDING" },
      { universityId: "u3", universityName: "West College", verificationStatus: "REJECTED" },
      { universityId: "u4", universityName: "East College", verificationStatus: "NOT_SUBMITTED" },
      {
        universityId: "u5",
        universityName: null,
        universityShortName: "SC",
        verificationStatus: null,
      },
      { universityId: null, universityName: null, verificationStatus: "UNKNOWN" },
    ],
  });
  render(<GuideVerificationPage />);
  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(6);
  [
    "Verified",
    "Pending",
    "Rejected",
    "Not submitted",
    "Status unavailable",
    "Status unavailable",
  ].forEach((label, index) => {
    expect(within(items[index]).getByText(label)).toBeInTheDocument();
  });
  expect(screen.getByRole("heading", { name: "SC" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "University name unavailable" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Set availability" })).toHaveAttribute(
    "href",
    "/guide/availability",
  );
  expect(screen.getByRole("link", { name: "Manage offerings" })).toHaveAttribute(
    "href",
    "/guide/tour-offerings",
  );
  expect(
    screen.getByText(/account and the university.*offering must be verified/),
  ).toBeInTheDocument();
});

it.each([undefined, []])("shows an actionable empty state for universities %j", (universities) => {
  setup({ guideStatus: "PENDING", universities });
  render(<GuideVerificationPage />);
  expect(screen.getByText("No universities listed")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Review university details" })).toHaveAttribute(
    "href",
    "/profile",
  );
});

it("refreshes status and renders the updated result", async () => {
  setup({ guideStatus: "PENDING" });
  const { rerender } = render(<GuideVerificationPage />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Refresh status" }));
  expect(refetch).toHaveBeenCalledTimes(1);
  setup({ guideStatus: "VERIFIED" });
  rerender(<GuideVerificationPage />);
  expect(screen.getByText("Verified")).toBeInTheDocument();
  expect(screen.queryByText("Pending verification")).not.toBeInTheDocument();
});
