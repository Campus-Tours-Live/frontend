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

  it("positions segments against an explicit caller-supplied domain (domainStart→0%, domainEnd→100%)", () => {
    // A window filling exactly the domain [8:00, 19:00] must span the full bar — this is the axis
    // domain the modal computes so a late slot (e.g. to 7 PM) is never cut off.
    render(
      <TimeAxisBar
        barLabel="After"
        ariaLabel="After applying on 2026-07-20"
        segments={[{ startMin: 480, endMin: 1140, kind: "extra", label: "8:00 AM – 7:00 PM" }]}
        domainStartMin={480}
        domainEndMin={1140}
      />,
    );
    const seg = screen.getByTitle(/Extra · 8:00 AM – 7:00 PM/);
    // startMin === domainStart → 0% left; endMin === domainEnd → 100% right → 100% width.
    expect(seg).toHaveStyle({ left: "0%", width: "100%" });
  });

  it("self-derives the domain (padded to whole hours) when no domain/range props are given", () => {
    // 9:15–10:45 pads outward to 9:00–11:00 (540–660): 9:15 (555) sits at 12.5% of the 120-min span.
    render(
      <TimeAxisBar
        barLabel="Now"
        ariaLabel="Current hours on 2026-07-20"
        segments={[{ startMin: 555, endMin: 645, kind: "available", label: "9:15 AM – 10:45 AM" }]}
      />,
    );
    const seg = screen.getByTitle(/Available · 9:15 AM – 10:45 AM/);
    expect(seg).toHaveStyle({ left: "12.5%", width: "75%" });
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

  it("left-aligns the first tick, right-aligns the last tick, and centers every tick in between — so edge labels never wrap past the container", () => {
    render(
      <TimeAxis
        ticks={[
          { min: 0, label: "12:00 AM" },
          { min: 360, label: "6:00 AM" },
          { min: 720, label: "12:00 PM" },
        ]}
        rangeStartMin={0}
        rangeEndMin={720}
      />,
    );
    const first = screen.getByText("12:00 AM");
    const middle = screen.getByText("6:00 AM");
    const last = screen.getByText("12:00 PM");

    // Every tick label must stay on one line — a wrapped label is the bug this guards against.
    expect(first).toHaveClass("whitespace-nowrap");
    expect(middle).toHaveClass("whitespace-nowrap");
    expect(last).toHaveClass("whitespace-nowrap");

    // First tick (left ≈ 0%): left-aligned — no negative translate that would push it off-edge.
    expect(first).toHaveClass("translate-x-0");
    expect(first).not.toHaveClass("-translate-x-1/2");
    expect(first).not.toHaveClass("-translate-x-full");

    // Middle tick: still centered on its mark, same as before this fix.
    expect(middle).toHaveClass("-translate-x-1/2");
    expect(middle).not.toHaveClass("translate-x-0");
    expect(middle).not.toHaveClass("-translate-x-full");

    // Last tick (left ≈ 100%): right-aligned so it sits inside the right edge.
    expect(last).toHaveClass("-translate-x-full");
    expect(last).not.toHaveClass("-translate-x-1/2");
    expect(last).not.toHaveClass("translate-x-0");
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
