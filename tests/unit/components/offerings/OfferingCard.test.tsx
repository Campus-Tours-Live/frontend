import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfferingCard } from "@/components/offerings/OfferingCard";
import { ApiError, useActivateOffering, type Offering } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useActivateOffering: jest.fn(),
}));

const mockUseActivateOffering = useActivateOffering as jest.Mock;

const draftOffering: Offering = {
  id: "o1",
  title: "Campus walk",
  slug: "campus-walk",
  status: "DRAFT",
  topic: "GENERAL_CAMPUS",
  universityId: "uni-1",
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
  description: "See the quad and library.",
};

function setActivate(overrides: Partial<ReturnType<typeof useActivateOffering>> = {}) {
  mockUseActivateOffering.mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setActivate();
});

describe("OfferingCard", () => {
  it("renders draft details and publishes when allowed", async () => {
    const user = userEvent.setup();
    const mutateAsync = jest.fn().mockResolvedValue({});
    setActivate({ mutateAsync });

    render(<OfferingCard offering={draftOffering} canPublish topicLabel="General campus" />);

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Not public")).toBeInTheDocument();
    expect(screen.getByText("See the quad and library.")).toBeInTheDocument();
    expect(screen.getByText("General campus")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(mutateAsync).toHaveBeenCalledWith("o1");
  });

  it("shows a guide-approval hint when publish is blocked", () => {
    render(<OfferingCard offering={draftOffering} canPublish={false} />);

    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(
      screen.getByText("Publishing unlocks after your guide application is approved."),
    ).toBeInTheDocument();
  });

  it("shows a 403 publish error", async () => {
    const user = userEvent.setup();
    setActivate({
      mutateAsync: jest.fn().mockRejectedValue(new ApiError(403, "Forbidden")),
    });

    render(<OfferingCard offering={draftOffering} canPublish />);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your guide application must be approved before you can publish.",
    );
  });

  it("shows a generic publish error", async () => {
    const user = userEvent.setup();
    setActivate({
      mutateAsync: jest.fn().mockRejectedValue(new Error("network")),
    });

    render(<OfferingCard offering={draftOffering} canPublish />);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not publish this offering. Please try again.",
    );
  });

  it("renders published offerings without a publish action", () => {
    render(
      <OfferingCard
        offering={{ ...draftOffering, status: "ACTIVE", description: null }}
        canPublish
      />,
    );

    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Visible publicly")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
    expect(screen.getByText("GENERAL_CAMPUS")).toBeInTheDocument();
  });
});
