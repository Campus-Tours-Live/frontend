import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuideUpcomingSchedule } from "@/components/bookings/GuideUpcomingSchedule";
import type { GuideBooking } from "@/lib/data-access";

const booking = (overrides: Partial<GuideBooking> = {}): GuideBooking => ({
  id: "b1",
  status: "CONFIRMED",
  scheduledAt: "2026-08-01T15:00:00Z",
  offeringId: "o1",
  offeringTitle: "Campus walk",
  participantName: "Sam Rivera",
  participantNotes: null,
  guideResponseDeadline: null,
  universityName: "North Coast University",
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
  ...overrides,
});

describe("GuideUpcomingSchedule", () => {
  it("renders day sections with labelled headings and booking cards", () => {
    const { container } = render(
      <GuideUpcomingSchedule
        bookings={[
          booking({ id: "b1", scheduledAt: "2026-08-01T10:00:00Z" }),
          booking({
            id: "b2",
            scheduledAt: "2026-08-02T18:00:00Z",
            offeringTitle: "Evening stroll",
          }),
        ]}
        busy={false}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />,
    );

    const sections = container.querySelectorAll("section");
    expect(sections.length).toBe(2);
    expect(screen.getByText("Campus walk")).toBeInTheDocument();
    expect(screen.getByText("Evening stroll")).toBeInTheDocument();

    for (const section of sections) {
      const labelledBy = section.getAttribute("aria-labelledby");
      expect(labelledBy).toBeTruthy();
      expect(section.querySelector(`#${labelledBy}`)).toBeInTheDocument();
    }
  });

  it("forwards accept and decline handlers for the clicked booking", async () => {
    const user = userEvent.setup();
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    const pending = booking({
      id: "b-pending",
      status: "WAITING_FOR_GUIDE",
      guideResponseDeadline: "2099-08-01T12:00:00Z",
    });

    render(
      <GuideUpcomingSchedule
        bookings={[pending]}
        busy={false}
        onAccept={onAccept}
        onDecline={onDecline}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^accept$/i }));
    expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({ id: "b-pending" }));

    await user.click(screen.getByRole("button", { name: /^decline$/i }));
    expect(onDecline).toHaveBeenCalledWith(expect.objectContaining({ id: "b-pending" }));
  });

  it("renders nothing when bookings is empty", () => {
    const { container } = render(
      <GuideUpcomingSchedule
        bookings={[]}
        busy={false}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />,
    );

    expect(container.querySelector("section")).not.toBeInTheDocument();
  });
});
