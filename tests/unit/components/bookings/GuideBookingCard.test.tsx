import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuideBookingCard } from "@/components/bookings/GuideBookingCard";
import type { GuideBooking } from "@/lib/data-access";

const base: GuideBooking = {
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

describe("GuideBookingCard", () => {
  it("shows notes and university when present", () => {
    render(
      <GuideBookingCard
        booking={{ ...base, participantNotes: "Meet at the gate" }}
        busy={false}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />,
    );
    expect(screen.getByText(/Meet at the gate/)).toBeInTheDocument();
    expect(screen.getByText(/North Coast University/)).toBeInTheDocument();
  });

  it("omits university separator when university is empty", () => {
    render(
      <GuideBookingCard
        booking={{ ...base, universityName: "" }}
        busy={false}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />,
    );
    expect(screen.getByText("Sam Rivera")).toBeInTheDocument();
    expect(screen.queryByText(/Sam Rivera ·/)).not.toBeInTheDocument();
  });

  it("highlights an expired response window", () => {
    render(
      <GuideBookingCard
        booking={{ ...base, guideResponseDeadline: "2000-01-01T00:00:00Z" }}
        busy={false}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />,
    );
    expect(screen.getByText(/Response window expired/)).toBeInTheDocument();
  });

  it("hides actions for confirmed bookings", () => {
    render(
      <GuideBookingCard
        booking={{ ...base, status: "CONFIRMED", guideResponseDeadline: null }}
        busy={false}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /^accept$/i })).not.toBeInTheDocument();
  });
});
