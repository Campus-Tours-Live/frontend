import { render, screen, within } from "@testing-library/react";
import {
  TimeAxis,
  TimeAxisBar,
  TimeAxisLegend,
  minToPercent,
  type TimeAxisSegment,
} from "@/components/availability/TimeAxisBar";

describe("minToPercent", () => {
  it("maps a minute-of-day to a clamped percentage across the range", () => {
    // 10:00 within a 9:00–12:00 (540–720) window is one third of the way.
    expect(minToPercent(600, 540, 720)).toBeCloseTo(33.333, 2);
    expect(minToPercent(540, 540, 720)).toBe(0);
    expect(minToPercent(720, 540, 720)).toBe(100);
  });

  it("clamps out-of-range minutes to 0–100", () => {
    expect(minToPercent(0, 540, 720)).toBe(0);
    expect(minToPercent(1440, 540, 720)).toBe(100);
  });

  it("never divides by zero for a degenerate range", () => {
    expect(minToPercent(600, 600, 600)).toBe(0);
  });
});

describe("TimeAxisBar", () => {
  const segments: TimeAxisSegment[] = [
    { startMin: 540, endMin: 570, kind: "available", label: "9:00 AM – 9:30 AM" },
    { startMin: 600, endMin: 660, kind: "off", label: "10:00 AM – 11:00 AM" },
    { startMin: 780, endMin: 840, kind: "extra", label: "1:00 PM – 2:00 PM" },
  ];

  it("labels the bar and renders each segment with its kind's colour class + title", () => {
    render(
      <TimeAxisBar
        barLabel="After"
        ariaLabel="After applying on 2026-07-20"
        segments={segments}
        rangeStartMin={540}
        rangeEndMin={900}
      />,
    );
    const bar = screen.getByRole("group", { name: "After applying on 2026-07-20" });
    expect(within(bar).getByText("After")).toBeInTheDocument();

    const available = within(bar).getByTitle(/Available · 9:00 AM – 9:30 AM/);
    expect(available).toHaveClass("bg-success");

    const off = within(bar).getByTitle(/Time off · 10:00 AM – 11:00 AM/);
    expect(off).toHaveClass("calendar-hatch");

    const extra = within(bar).getByTitle(/Extra · 1:00 PM – 2:00 PM/);
    expect(extra).toHaveClass("bg-primary");
  });

  it("positions segments with left/width percentages of the range", () => {
    render(
      <TimeAxisBar
        barLabel="Now"
        ariaLabel="Current hours on 2026-07-20"
        segments={[{ startMin: 540, endMin: 720, kind: "available", label: "9:00 AM – 12:00 PM" }]}
        rangeStartMin={540}
        rangeEndMin={900}
      />,
    );
    const seg = screen.getByTitle(/Available · 9:00 AM – 12:00 PM/);
    // 540 → 0% left; 720 → 50% across a 540–900 (360-min) range.
    expect(seg).toHaveStyle({ left: "0%", width: "50%" });
  });
});

describe("TimeAxis", () => {
  it("renders each tick label", () => {
    render(
      <TimeAxis
        ticks={[
          { min: 540, label: "9:00 AM" },
          { min: 720, label: "12:00 PM" },
        ]}
        rangeStartMin={540}
        rangeEndMin={720}
      />,
    );
    expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    expect(screen.getByText("12:00 PM")).toBeInTheDocument();
  });
});

describe("TimeAxisLegend", () => {
  it("names all three segment kinds", () => {
    render(<TimeAxisLegend />);
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Time off")).toBeInTheDocument();
    expect(screen.getByText("Extra")).toBeInTheDocument();
  });
});
