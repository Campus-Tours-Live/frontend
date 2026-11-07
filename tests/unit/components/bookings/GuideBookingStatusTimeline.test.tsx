import { render, screen } from "@testing-library/react";
import { GuideBookingStatusTimeline } from "@/components/bookings/GuideBookingStatusTimeline";
import type { GuideBookingStatusEvent } from "@/lib/data-access";

const events: GuideBookingStatusEvent[] = [
  {
    status: "WAITING_FOR_GUIDE",
    previousStatus: null,
    actor: "PARTICIPANT",
    reasonCode: "PARTICIPANT_CREATED",
    occurredAt: "2026-07-29T10:00:00Z",
  },
  {
    status: "CONFIRMED",
    previousStatus: "WAITING_FOR_GUIDE",
    actor: "GUIDE",
    reasonCode: "GUIDE_ACCEPTED",
    occurredAt: "2026-07-29T11:00:00Z",
  },
];

describe("GuideBookingStatusTimeline", () => {
  it("renders the newest event first with labels", () => {
    render(<GuideBookingStatusTimeline events={events} />);

    const items = screen.getAllByText(/Guide accepted|Booking created/);
    expect(items[0]).toHaveTextContent("Guide accepted");
    expect(screen.getByText("Booking created")).toBeInTheDocument();
    expect(screen.getAllByText(/Guide ·|Participant ·/).length).toBeGreaterThanOrEqual(2);
  });

  it("shows empty copy when there is no history", () => {
    render(<GuideBookingStatusTimeline events={[]} />);
    expect(screen.getByText(/no status history yet/i)).toBeInTheDocument();
  });
});
