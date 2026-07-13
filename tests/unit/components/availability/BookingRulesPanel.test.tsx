import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

/** The full policy `<dl>` is always mounted (it's `hidden lg:block`, shown from `lg` up); the
 *  mobile summary `<dl>` shares the timezone/response-deadline/min-notice fields, so scope
 *  full-panel assertions to this container to avoid double matches. */
function fullPanel() {
  return within(screen.getByTestId("booking-rules-full"));
}

describe("BookingRulesPanel", () => {
  it("renders the timezone, acceptance mode, and formatted minute/day fields", () => {
    render(<BookingRulesPanel settings={settings} />);

    expect(screen.getByText("Booking rules")).toBeInTheDocument();
    expect(fullPanel().getByText("America/Los Angeles")).toBeInTheDocument();
    expect(fullPanel().getByText("AUTO")).toBeInTheDocument();
    expect(fullPanel().getByText("1h")).toBeInTheDocument(); // responseDeadlineMin: 60
    expect(fullPanel().getByText("2h")).toBeInTheDocument(); // minNoticeMin: 120
    expect(fullPanel().getByText("30 days ahead")).toBeInTheDocument();
    expect(fullPanel().getAllByText("15m")).toHaveLength(2); // both buffers
  });

  it("joins the durations-offered list with formatted labels", () => {
    render(<BookingRulesPanel settings={settings} />);
    expect(fullPanel().getByText("30m, 1h")).toBeInTheDocument();
  });

  it("shows 'None set' for an empty durations-offered list", () => {
    render(<BookingRulesPanel settings={{ ...settings, durationsOffered: [] }} />);
    expect(fullPanel().getByText("None set")).toBeInTheDocument();
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

    expect(fullPanel().getAllByText("None")).toHaveLength(4);
    expect(fullPanel().queryByText("0m")).not.toBeInTheDocument();
  });

  it("renders MANUAL acceptance mode", () => {
    render(<BookingRulesPanel settings={{ ...settings, acceptanceMode: "MANUAL" }} />);
    expect(fullPanel().getByText("MANUAL")).toBeInTheDocument();
  });

  describe("mobile-collapsible disclosure", () => {
    it("shows a compact summary (timezone, response deadline, minimum notice) with a collapsed toggle", () => {
      render(<BookingRulesPanel settings={settings} />);

      const summary = within(screen.getByTestId("booking-rules-summary"));
      expect(summary.getByText("Timezone")).toBeInTheDocument();
      expect(summary.getByText("Response deadline")).toBeInTheDocument();
      expect(summary.getByText("Minimum notice")).toBeInTheDocument();
      // Fields that only belong to the full policy are not in the summary.
      expect(summary.queryByText("Scheduling window")).not.toBeInTheDocument();
      expect(summary.queryByText("Acceptance")).not.toBeInTheDocument();

      const toggle = screen.getByRole("button", { name: /view all rules/i });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      // Collapsed on mobile: the full policy `<dl>` carries the `hidden` class (only `lg:block`).
      expect(screen.getByTestId("booking-rules-full")).toHaveClass("hidden");
    });

    it("expands the full policy when 'View all rules' is clicked", async () => {
      const user = userEvent.setup();
      render(<BookingRulesPanel settings={settings} />);

      await user.click(screen.getByRole("button", { name: /view all rules/i }));

      const full = screen.getByTestId("booking-rules-full");
      expect(full).toHaveClass("block");
      expect(full).not.toHaveClass("hidden");
      // A full-only field (scheduling window) is now shown via the expanded policy.
      expect(within(full).getByText("Scheduling window")).toBeInTheDocument();
      expect(within(full).getByText("30 days ahead")).toBeInTheDocument();
      // The mobile summary/toggle wrapper is hidden once expanded.
      expect(screen.getByTestId("booking-rules-summary")).toHaveClass("hidden");
    });

    it("collapses back to the summary when 'Show less' is clicked", async () => {
      const user = userEvent.setup();
      render(<BookingRulesPanel settings={settings} />);

      await user.click(screen.getByRole("button", { name: /view all rules/i }));
      const showLess = screen.getByRole("button", { name: /show less/i });
      // Visible once expanded (mobile-only collapse control), hidden from `lg` up.
      expect(showLess).toHaveClass("block", "lg:hidden");

      await user.click(showLess);

      // Back to the collapsed state: summary visible, full policy hidden on mobile again,
      // and the "Show less" control is CSS-hidden.
      expect(screen.getByTestId("booking-rules-summary")).toHaveClass("block");
      expect(screen.getByTestId("booking-rules-full")).toHaveClass("hidden");
      expect(screen.getByRole("button", { name: /view all rules/i })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(screen.getByRole("button", { name: /show less/i })).toHaveClass("hidden");
    });
  });
});
