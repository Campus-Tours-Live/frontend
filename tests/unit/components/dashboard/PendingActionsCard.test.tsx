import { render, screen } from "@testing-library/react";
import { PendingActionsCard } from "@/components/dashboard/PendingActionsCard";
import type { PendingActions, BookingResponse } from "@/lib/data-access";

const emptyActions: PendingActions = { paymentsToFinish: 0, waitingForGuide: 0, reviewsToWrite: 0 };

const withActions: PendingActions = { paymentsToFinish: 2, waitingForGuide: 1, reviewsToWrite: 3 };

const waitingBooking: BookingResponse = {
  id: "bk_1",
  status: "WAITING_FOR_GUIDE",
  scheduledStartAt: "2026-09-20T15:00:00Z",
  scheduledEndAt: "2026-09-20T16:00:00Z",
  durationMinutes: 60,
  tourOfferingId: "off_1",
  tourTitle: "Campus life tour",
  guideName: "Maya Chen",
  guideResponseDeadline: "2026-09-15T09:30:00Z",
  universityName: "North Coast University",
  price: { amount: 4200, currency: "USD" },
};

describe("PendingActionsCard", () => {
  it("renders the heading and section label", () => {
    render(<PendingActionsCard actions={emptyActions} />);
    expect(screen.getByText("Pending actions")).toBeInTheDocument();
    expect(screen.getByText("Need your attention")).toBeInTheDocument();
  });

  it("renders all three counter labels", () => {
    render(<PendingActionsCard actions={emptyActions} />);
    expect(screen.getByText("Payments to finish")).toBeInTheDocument();
    expect(screen.getByText("Waiting for guide")).toBeInTheDocument();
    expect(screen.getByText("Reviews to write")).toBeInTheDocument();
  });

  it("renders correct counter values", () => {
    render(<PendingActionsCard actions={withActions} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows all-caught-up message when all counts are zero", () => {
    render(<PendingActionsCard actions={emptyActions} />);
    expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
  });

  it("hides all-caught-up message when there are pending actions", () => {
    render(<PendingActionsCard actions={withActions} />);
    expect(screen.queryByText("You're all caught up!")).not.toBeInTheDocument();
  });

  it("renders the guide response pending card when waitingBooking is provided", () => {
    render(<PendingActionsCard actions={emptyActions} waitingBooking={waitingBooking} />);
    expect(screen.getByText("Guide response pending")).toBeInTheDocument();
  });

  it("does not render the guide response card when no waitingBooking", () => {
    render(<PendingActionsCard actions={emptyActions} />);
    expect(screen.queryByText("Guide response pending")).not.toBeInTheDocument();
  });

  it("renders a View link on the guide response card", () => {
    render(<PendingActionsCard actions={emptyActions} waitingBooking={waitingBooking} />);
    expect(screen.getByRole("link", { name: "View" })).toBeInTheDocument();
  });
});
