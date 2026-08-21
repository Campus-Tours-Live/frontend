import { render, screen } from "@testing-library/react";
import { BookedTours } from "@/components/dashboard/BookedTours";
import type { BookingResponse } from "@/lib/data-access";

const baseBooking: BookingResponse = {
  id: "bk-1",
  status: "CONFIRMED",
  scheduledStartAt: "2026-06-27T20:00:00Z",
  scheduledEndAt: "2026-06-27T21:30:00Z",
  durationMinutes: 90,
  tourOfferingId: "off-1",
  tourTitle: "Engineering quad tour",
  guideName: "Maya Chen",
  guideResponseDeadline: null,
  universityName: "North Coast University",
  price: { amount: 4200, currency: "USD" },
};

describe("BookedTours", () => {
  it("renders nothing when bookings is an empty array", () => {
    const { container } = render(<BookedTours bookings={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the section heading when there are bookings", () => {
    render(<BookedTours bookings={[baseBooking]} />);
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Your booked tours")).toBeInTheDocument();
  });

  it("renders the 'View all' link pointing to /my-bookings", () => {
    render(<BookedTours bookings={[baseBooking]} />);
    const link = screen.getByRole("link", { name: "View all" });
    expect(link).toHaveAttribute("href", "/my-bookings");
  });

  it("renders a card for each booking in the list", () => {
    const second: BookingResponse = {
      ...baseBooking,
      id: "bk-2",
      tourTitle: "Campus life and hidden study spots",
      universityName: "Redwood State College",
    };
    render(<BookedTours bookings={[baseBooking, second]} />);
    expect(screen.getByText("Engineering quad tour")).toBeInTheDocument();
    expect(screen.getByText("Campus life and hidden study spots")).toBeInTheDocument();
  });

  it("renders the tour title and university name in each card", () => {
    render(<BookedTours bookings={[baseBooking]} />);
    expect(screen.getByText("Engineering quad tour")).toBeInTheDocument();
    expect(screen.getByText(/North Coast University/)).toBeInTheDocument();
  });

  it("shows 'Confirmed' status badge for a CONFIRMED booking", () => {
    render(<BookedTours bookings={[{ ...baseBooking, status: "CONFIRMED" }]} />);
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("shows 'Waiting for guide' status badge for a WAITING_FOR_GUIDE booking", () => {
    render(<BookedTours bookings={[{ ...baseBooking, status: "WAITING_FOR_GUIDE" }]} />);
    expect(screen.getByText("Waiting for guide")).toBeInTheDocument();
  });

  it("shows 'Completed' status badge for a COMPLETED booking", () => {
    render(<BookedTours bookings={[{ ...baseBooking, status: "COMPLETED" }]} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows 'Cancelled' status badge for a CANCELLED booking", () => {
    render(<BookedTours bookings={[{ ...baseBooking, status: "CANCELLED" }]} />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("renders 'View' and 'Reschedule' links for a CONFIRMED booking", () => {
    render(<BookedTours bookings={[{ ...baseBooking, status: "CONFIRMED" }]} />);
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/my-bookings/bk-1");
    expect(screen.getByRole("link", { name: "Reschedule" })).toHaveAttribute(
      "href",
      "/my-bookings/bk-1/reschedule",
    );
  });

  it("renders 'View request' link (not Reschedule) for a WAITING_FOR_GUIDE booking", () => {
    render(<BookedTours bookings={[{ ...baseBooking, status: "WAITING_FOR_GUIDE" }]} />);
    expect(screen.getByRole("link", { name: "View request" })).toHaveAttribute(
      "href",
      "/my-bookings/bk-1",
    );
    expect(screen.queryByRole("link", { name: "Reschedule" })).not.toBeInTheDocument();
  });

  it("renders a 'View' link (not Reschedule) for a COMPLETED booking", () => {
    render(<BookedTours bookings={[{ ...baseBooking, status: "COMPLETED" }]} />);
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/my-bookings/bk-1");
    expect(screen.queryByRole("link", { name: "Reschedule" })).not.toBeInTheDocument();
  });

  it("renders per-booking links with the correct booking id", () => {
    const second: BookingResponse = { ...baseBooking, id: "bk-99", status: "CONFIRMED" };
    render(<BookedTours bookings={[second]} />);
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/my-bookings/bk-99",
    );
    expect(screen.getByRole("link", { name: "Reschedule" })).toHaveAttribute(
      "href",
      "/my-bookings/bk-99/reschedule",
    );
  });
});
