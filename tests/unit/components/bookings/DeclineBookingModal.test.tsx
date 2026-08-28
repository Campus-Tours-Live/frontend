import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeclineBookingModal } from "@/components/bookings/DeclineBookingModal";
import type { GuideBooking } from "@/lib/data-access";

const booking: GuideBooking = {
  id: "b1",
  status: "WAITING_FOR_GUIDE",
  scheduledAt: "2026-08-01T15:00:00Z",
  offeringId: "o1",
  offeringTitle: "Campus walk",
  participantName: "Sam Rivera",
  universityName: "North Coast University",
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
};

describe("DeclineBookingModal", () => {
  it("submits a trimmed reason and shows Declining while pending", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const { rerender } = render(
      <DeclineBookingModal
        open
        booking={booking}
        pending={false}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/reason/i), "  Busy that day  ");
    await user.click(screen.getByRole("button", { name: /^decline$/i }));
    expect(onConfirm).toHaveBeenCalledWith("Busy that day");

    rerender(
      <DeclineBookingModal
        open
        booking={booking}
        pending
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole("button", { name: /declining/i })).toBeDisabled();
  });

  it("falls back to generic copy when booking is null", () => {
    render(
      <DeclineBookingModal
        open
        booking={null}
        pending={false}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    expect(screen.getByText(/Decline this booking request/)).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <DeclineBookingModal
        open
        booking={booking}
        pending={false}
        onClose={onClose}
        onConfirm={jest.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("submits without a reason when the field is left blank", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    render(
      <DeclineBookingModal
        open
        booking={booking}
        pending={false}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^decline$/i }));
    expect(onConfirm).toHaveBeenCalledWith("");
  });
});
