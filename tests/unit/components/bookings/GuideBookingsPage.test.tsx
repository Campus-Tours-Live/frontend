import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuideBookingsPage } from "@/components/bookings/GuideBookingsPage";
import { useAcceptBooking, useDeclineBooking, useGuideBookings } from "@/lib/data-access";
import type { GuideBooking } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useGuideBookings: jest.fn(),
  useAcceptBooking: jest.fn(),
  useDeclineBooking: jest.fn(),
}));

const mockUseGuideBookings = useGuideBookings as jest.Mock;
const mockUseAcceptBooking = useAcceptBooking as jest.Mock;
const mockUseDeclineBooking = useDeclineBooking as jest.Mock;

const pendingBooking: GuideBooking = {
  id: "b1",
  status: "WAITING_FOR_GUIDE",
  scheduledAt: "2026-08-01T15:00:00Z",
  offeringId: "o1",
  offeringTitle: "Campus walk",
  participantName: "Sam Rivera",
  participantNotes: null,
  guideResponseDeadline: "2099-08-01T12:00:00Z",
  universityName: "North Coast University",
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
};

const confirmedBooking: GuideBooking = {
  ...pendingBooking,
  id: "b2",
  status: "CONFIRMED",
  guideResponseDeadline: null,
};

function setHooks(
  overrides: {
    bookings?: Partial<ReturnType<typeof useGuideBookings>>;
    accept?: { mutateAsync?: jest.Mock; isPending?: boolean };
    decline?: { mutateAsync?: jest.Mock; isPending?: boolean };
  } = {},
) {
  mockUseGuideBookings.mockReturnValue({
    data: [pendingBooking, confirmedBooking],
    isLoading: false,
    isError: false,
    ...overrides.bookings,
  });
  mockUseAcceptBooking.mockReturnValue({
    mutateAsync: overrides.accept?.mutateAsync ?? jest.fn().mockResolvedValue({}),
    isPending: overrides.accept?.isPending ?? false,
  });
  mockUseDeclineBooking.mockReturnValue({
    mutateAsync: overrides.decline?.mutateAsync ?? jest.fn().mockResolvedValue({}),
    isPending: overrides.decline?.isPending ?? false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setHooks();
});

describe("GuideBookingsPage", () => {
  it("renders a loading state while bookings are loading", () => {
    setHooks({ bookings: { data: undefined, isLoading: true, isError: false } });
    render(<GuideBookingsPage />);
    expect(screen.getByText(/loading bookings/i)).toBeInTheDocument();
  });

  it("renders an error alert when bookings fail to load", () => {
    setHooks({ bookings: { data: undefined, isLoading: false, isError: true } });
    render(<GuideBookingsPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load your bookings.");
  });

  it("shows empty state when there are no bookings", () => {
    setHooks({ bookings: { data: [], isLoading: false, isError: false } });
    render(<GuideBookingsPage />);
    expect(screen.getByText(/no pending or upcoming bookings/i)).toBeInTheDocument();
  });

  it("shows filter-specific empty copy", async () => {
    const user = userEvent.setup();
    setHooks({ bookings: { data: [], isLoading: false, isError: false } });
    render(<GuideBookingsPage />);

    await user.click(screen.getByRole("button", { name: /^pending$/i }));
    expect(screen.getByText(/no pending booking requests/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^upcoming$/i }));
    expect(screen.getByText(/no upcoming confirmed tours/i)).toBeInTheDocument();
  });

  it("lists bookings with accept/decline on pending rows", () => {
    render(<GuideBookingsPage />);
    expect(screen.getAllByText("Campus walk").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Sam Rivera/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /^accept$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^decline$/i })).toBeInTheDocument();
  });

  it("calls accept mutation when Accept is clicked", async () => {
    const user = userEvent.setup();
    const mutateAsync = jest.fn().mockResolvedValue({});
    setHooks({ accept: { mutateAsync } });
    render(<GuideBookingsPage />);

    await user.click(screen.getByRole("button", { name: /^accept$/i }));
    expect(mutateAsync).toHaveBeenCalledWith("b1");
  });

  it("surfaces an error when accept fails", async () => {
    const user = userEvent.setup();
    const mutateAsync = jest.fn().mockRejectedValue(new Error("boom"));
    setHooks({ accept: { mutateAsync } });
    render(<GuideBookingsPage />);

    await user.click(screen.getByRole("button", { name: /^accept$/i }));
    expect(await screen.findByText(/could not accept this booking/i)).toBeInTheDocument();
  });

  it("opens decline modal and calls decline mutation", async () => {
    const user = userEvent.setup();
    const mutateAsync = jest.fn().mockResolvedValue({});
    setHooks({ decline: { mutateAsync } });
    render(<GuideBookingsPage />);

    await user.click(screen.getByRole("button", { name: /^decline$/i }));
    expect(screen.getByRole("heading", { name: /decline booking/i })).toBeInTheDocument();

    // Card Decline is still in the tree; prefer the modal footer button (last).
    const declineButtons = screen.getAllByRole("button", { name: /^decline$/i });
    await user.click(declineButtons[declineButtons.length - 1]!);
    expect(mutateAsync).toHaveBeenCalledWith({ bookingId: "b1", body: undefined });
  });

  it("declines with an optional reason and closes on cancel", async () => {
    const user = userEvent.setup();
    const mutateAsync = jest.fn().mockResolvedValue({});
    setHooks({ decline: { mutateAsync } });
    render(<GuideBookingsPage />);

    await user.click(screen.getByRole("button", { name: /^decline$/i }));
    await user.type(screen.getByLabelText(/reason/i), "Schedule conflict");
    const declineButtons = screen.getAllByRole("button", { name: /^decline$/i });
    await user.click(declineButtons[declineButtons.length - 1]!);
    expect(mutateAsync).toHaveBeenCalledWith({
      bookingId: "b1",
      body: { reason: "Schedule conflict" },
    });
  });

  it("surfaces an error when decline fails", async () => {
    const user = userEvent.setup();
    const mutateAsync = jest.fn().mockRejectedValue(new Error("boom"));
    setHooks({ decline: { mutateAsync } });
    render(<GuideBookingsPage />);

    await user.click(screen.getByRole("button", { name: /^decline$/i }));
    const declineButtons = screen.getAllByRole("button", { name: /^decline$/i });
    await user.click(declineButtons[declineButtons.length - 1]!);
    expect(await screen.findByText(/could not decline this booking/i)).toBeInTheDocument();
  });

  it("closes the decline modal via Cancel", async () => {
    const user = userEvent.setup();
    render(<GuideBookingsPage />);

    await user.click(screen.getByRole("button", { name: /^decline$/i }));
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByRole("heading", { name: /decline booking/i })).not.toBeInTheDocument();
  });

  it("switches filter chips", async () => {
    const user = userEvent.setup();
    render(<GuideBookingsPage />);
    await user.click(screen.getByRole("button", { name: /^pending$/i }));
    expect(mockUseGuideBookings).toHaveBeenLastCalledWith("pending");
  });
});
