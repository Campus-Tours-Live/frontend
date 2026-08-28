import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuideBookingDetailPage } from "@/components/bookings/GuideBookingDetailPage";
import { useAcceptBooking, useDeclineBooking, useGuideBooking } from "@/lib/data-access";
import type { GuideBooking } from "@/lib/data-access";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams("returnFilter=upcoming"),
}));

jest.mock("@/lib/data-access", () => ({
  useGuideBooking: jest.fn(),
  useAcceptBooking: jest.fn(),
  useDeclineBooking: jest.fn(),
}));

const mockUseGuideBooking = useGuideBooking as jest.Mock;
const mockUseAcceptBooking = useAcceptBooking as jest.Mock;
const mockUseDeclineBooking = useDeclineBooking as jest.Mock;

const booking: GuideBooking = {
  id: "b1",
  bookingNumber: "CTL-2026-00042",
  status: "CONFIRMED",
  scheduledAt: "2026-08-01T15:00:00Z",
  offeringId: "o1",
  offeringTitle: "Campus walk",
  participantName: "Sam Rivera",
  participantNotes: "Meet at the gate",
  guideResponseDeadline: null,
  universityName: "North Coast University",
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
  statusHistory: [
    {
      status: "CONFIRMED",
      previousStatus: "WAITING_FOR_GUIDE",
      actor: "GUIDE",
      reasonCode: "GUIDE_ACCEPTED",
      occurredAt: "2026-07-29T11:00:00Z",
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseGuideBooking.mockReturnValue({
    data: booking,
    isLoading: false,
    isError: false,
  });
  mockUseAcceptBooking.mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  });
  mockUseDeclineBooking.mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  });
});

describe("GuideBookingDetailPage", () => {
  it("renders booking details, notes, and status history", () => {
    render(<GuideBookingDetailPage bookingId="b1" />);

    expect(screen.getByRole("heading", { name: "Campus walk" })).toBeInTheDocument();
    expect(screen.getByText("Meet at the gate")).toBeInTheDocument();
    expect(screen.getByText("Guide accepted")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to bookings/i })).toHaveAttribute(
      "href",
      "/guide/bookings?filter=upcoming",
    );
  });

  it("shows accept/decline actions for pending bookings", async () => {
    const user = userEvent.setup();
    const mutateAsync = jest.fn().mockResolvedValue({});
    mockUseAcceptBooking.mockReturnValue({ mutateAsync, isPending: false });
    mockUseGuideBooking.mockReturnValue({
      data: {
        ...booking,
        status: "WAITING_FOR_GUIDE",
        guideResponseDeadline: "2099-08-01T12:00:00Z",
      },
      isLoading: false,
      isError: false,
    });

    render(<GuideBookingDetailPage bookingId="b1" />);

    await user.click(screen.getByRole("button", { name: /^accept$/i }));
    expect(mutateAsync).toHaveBeenCalledWith("b1");
  });
});
