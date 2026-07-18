import { render, screen } from "@testing-library/react";
import { AffectedBookingsNotice } from "@/components/availability/AffectedBookingsNotice";
import type { AffectedBooking } from "@/lib/data-access";

function booking(over: Partial<AffectedBooking> = {}): AffectedBooking {
  return {
    bookingId: "b1",
    bookingNumber: "BK-1001",
    status: "CONFIRMED",
    scheduledStartAt: "2026-07-18T14:00:00Z", // 9:00 AM America/Chicago (CDT)
    scheduledEndAt: "2026-07-18T15:00:00Z", // 10:00 AM
    ...over,
  };
}

describe("AffectedBookingsNotice", () => {
  it("renders nothing when there are no affected bookings", () => {
    const { container } = render(
      <AffectedBookingsNotice bookings={[]} timeZone="America/Chicago" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("uses singular copy and lists the one booking's number + windowed date", () => {
    render(<AffectedBookingsNotice bookings={[booking()]} timeZone="America/Chicago" />);
    expect(screen.getByText(/1 existing booking/i)).toBeInTheDocument();
    expect(screen.getByText("BK-1001")).toBeInTheDocument();
    // 14:00Z rendered in America/Chicago (CDT) → Sat, 7/18 at 9:00 AM.
    expect(screen.getByText(/Sat, 7\/18 · 9:00\s?AM – 10:00\s?AM/)).toBeInTheDocument();
  });

  it("uses plural copy and lists every booking", () => {
    render(
      <AffectedBookingsNotice
        bookings={[booking(), booking({ bookingId: "b2", bookingNumber: "BK-1002" })]}
        timeZone="America/Chicago"
      />,
    );
    expect(screen.getByText(/2 existing bookings/i)).toBeInTheDocument();
    expect(screen.getByText("BK-1001")).toBeInTheDocument();
    expect(screen.getByText("BK-1002")).toBeInTheDocument();
  });

  it("makes clear the bookings are kept, not cancelled", () => {
    render(<AffectedBookingsNotice bookings={[booking()]} timeZone="America/Chicago" />);
    expect(screen.getByText(/kept, not cancelled/i)).toBeInTheDocument();
  });
});
