import { render, screen } from "@testing-library/react";
import { BookingRulesPanel } from "@/components/availability/BookingRulesPanel";
import type { AvailabilitySettings } from "@/lib/data-access";

const settings: AvailabilitySettings = {
  guideId: "g1",
  acceptanceMode: "AUTO",
  responseDeadlineMin: 60,
  minNoticeMin: 120,
  maxAdvanceDays: 30,
  bufferBeforeMin: 15,
  bufferAfterMin: 15,
  durationsOffered: [30, 60],
  timezone: "America/Los_Angeles",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("BookingRulesPanel", () => {
  it("renders the timezone, acceptance mode, and formatted minute/day fields", () => {
    render(<BookingRulesPanel settings={settings} />);

    expect(screen.getByText("Booking rules")).toBeInTheDocument();
    expect(screen.getByText("America/Los Angeles")).toBeInTheDocument();
    expect(screen.getByText("AUTO")).toBeInTheDocument();
    expect(screen.getByText("1h")).toBeInTheDocument(); // responseDeadlineMin: 60
    expect(screen.getByText("2h")).toBeInTheDocument(); // minNoticeMin: 120
    expect(screen.getByText("30 days ahead")).toBeInTheDocument();
    expect(screen.getAllByText("15m")).toHaveLength(2); // both buffers
  });

  it("joins the durations-offered list with formatted labels", () => {
    render(<BookingRulesPanel settings={settings} />);
    expect(screen.getByText("30m, 1h")).toBeInTheDocument();
  });

  it("shows 'None set' for an empty durations-offered list", () => {
    render(<BookingRulesPanel settings={{ ...settings, durationsOffered: [] }} />);
    expect(screen.getByText("None set")).toBeInTheDocument();
  });

  it("shows 'None' for zeroed-out minute fields instead of '0m'", () => {
    render(
      <BookingRulesPanel
        settings={{
          ...settings,
          responseDeadlineMin: 0,
          minNoticeMin: 0,
          bufferBeforeMin: 0,
          bufferAfterMin: 0,
        }}
      />,
    );

    expect(screen.getAllByText("None")).toHaveLength(4);
    expect(screen.queryByText("0m")).not.toBeInTheDocument();
  });

  it("renders MANUAL acceptance mode", () => {
    render(<BookingRulesPanel settings={{ ...settings, acceptanceMode: "MANUAL" }} />);
    expect(screen.getByText("MANUAL")).toBeInTheDocument();
  });
});
