import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfferingCard } from "@/components/offerings/OfferingCard";
import {
  ApiError,
  useActivateOffering,
  useDuplicateOffering,
  usePauseOffering,
  useRetireOffering,
  type Offering,
} from "@/lib/data-access";
import { AuthCancelledError, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useActivateOffering: jest.fn(),
  usePauseOffering: jest.fn(),
  useRetireOffering: jest.fn(),
  useDuplicateOffering: jest.fn(),
}));

const mockUseActivateOffering = useActivateOffering as jest.Mock;
const mockUsePauseOffering = usePauseOffering as jest.Mock;
const mockUseRetireOffering = useRetireOffering as jest.Mock;
const mockUseDuplicateOffering = useDuplicateOffering as jest.Mock;

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

function setLifecycleHooks() {
  for (const hook of [mockUsePauseOffering, mockUseRetireOffering, mockUseDuplicateOffering]) {
    hook.mockReturnValue({ mutateAsync: jest.fn().mockResolvedValue({}), isPending: false });
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  setActivate();
  setLifecycleHooks();
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

  it("falls back to an em dash when no topic label or topic is available", () => {
    render(<OfferingCard offering={{ ...draftOffering, topic: null }} canPublish={false} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("attributes a dismissed sign-in prompt to auth, not to the publish failing", async () => {
    // N1a Symptom A′ on a WRITE: the publish never ran, so telling the guide it "could not
    // be published" sends them retrying against a wall they can't see.
    const user = userEvent.setup();
    setActivate({
      mutateAsync: jest.fn().mockRejectedValue(new AuthCancelledError()),
    });

    render(<OfferingCard offering={draftOffering} canPublish />);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(screen.getByRole("alert")).toHaveTextContent(SIGN_IN_AGAIN_MESSAGE);
    expect(screen.getByRole("alert")).not.toHaveTextContent("Could not publish this offering");
  });

  it("shows a publishing indicator while the publish mutation is pending", () => {
    setActivate({ isPending: true });

    render(<OfferingCard offering={draftOffering} canPublish />);

    expect(screen.getByRole("button", { name: "Publishing…" })).toBeDisabled();
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
    expect(screen.getByRole("link", { name: "View public listing" })).toHaveAttribute(
      "href",
      "/tours/o1",
    );
    expect(screen.getByRole("button", { name: "Pause" })).toBeEnabled();
  });

  it("allows a paused offering to be published again", async () => {
    const user = userEvent.setup();
    const mutateAsync = jest.fn().mockResolvedValue({});
    setActivate({ mutateAsync });

    render(<OfferingCard offering={{ ...draftOffering, status: "PAUSED" }} canPublish />);

    expect(screen.getByText("Paused")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Publish" }));
    expect(mutateAsync).toHaveBeenCalledWith("o1");
  });

  it("can pause, retire, and duplicate an active offering", async () => {
    const user = userEvent.setup();
    const pause = jest.fn().mockResolvedValue({});
    const retire = jest.fn().mockResolvedValue({});
    const duplicate = jest.fn().mockResolvedValue({});
    mockUsePauseOffering.mockReturnValue({ mutateAsync: pause, isPending: false });
    mockUseRetireOffering.mockReturnValue({ mutateAsync: retire, isPending: false });
    mockUseDuplicateOffering.mockReturnValue({ mutateAsync: duplicate, isPending: false });

    render(<OfferingCard offering={{ ...draftOffering, status: "ACTIVE" }} canPublish />);

    await user.click(screen.getByRole("button", { name: "Pause" }));
    await user.click(screen.getByRole("button", { name: "Retire" }));
    await user.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(pause).toHaveBeenCalledWith("o1");
    expect(retire).toHaveBeenCalledWith("o1");
    expect(duplicate).toHaveBeenCalledWith("o1");
  });
});
