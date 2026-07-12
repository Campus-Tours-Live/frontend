import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthAvailabilityView } from "@/components/availability/MonthAvailabilityView";
import { useAvailabilitySettings, useResolvedAvailability } from "@/lib/data-access";
import type { AvailabilitySettings, ResolvedAvailability } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useResolvedAvailability: jest.fn(),
  useAvailabilitySettings: jest.fn(),
}));

const mockUseResolvedAvailability = useResolvedAvailability as jest.Mock;
const mockUseAvailabilitySettings = useAvailabilitySettings as jest.Mock;

const sampleSettings: AvailabilitySettings = {
  guideId: "g1",
  acceptanceMode: "AUTO",
  responseDeadlineMin: 60,
  minNoticeMin: 120,
  maxAdvanceDays: 30,
  bufferBeforeMin: 15,
  bufferAfterMin: 15,
  durationsOffered: [30, 60],
  timezone: "America/Chicago",
  updatedAt: "2026-01-01T00:00:00Z",
};

// All times below are already UTC instants that land on the given settings-tz (America/Chicago,
// UTC-5 in July) calendar date — chosen comfortably mid-day so no DST/tz edge shifts the bucket.
function resolved(occurrences: ResolvedAvailability["occurrences"]): ResolvedAvailability {
  return { rules: [], occurrences, dstGapDays: [] };
}

function setResolved(occurrences: ResolvedAvailability["occurrences"]) {
  mockUseResolvedAvailability.mockReturnValue({
    data: resolved(occurrences),
    isLoading: false,
    isError: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-07-15T18:00:00Z"));
  mockUseAvailabilitySettings.mockReturnValue({
    data: sampleSettings,
    isLoading: false,
    isError: false,
  });
  setResolved([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("MonthAvailabilityView — density + hatch", () => {
  it("renders density on days with occurrences and hatch on a zero-availability day", () => {
    setResolved([
      // 2026-07-05: one short window (~1h) -> low density
      { startAt: "2026-07-05T14:00:00Z", endAt: "2026-07-05T15:00:00Z" },
      // 2026-07-10: two windows totalling 6h -> high density
      { startAt: "2026-07-10T14:00:00Z", endAt: "2026-07-10T17:00:00Z" },
      { startAt: "2026-07-10T18:00:00Z", endAt: "2026-07-10T21:00:00Z" },
      // 2026-07-20: one 3h window -> mid density
      { startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T17:00:00Z" },
    ]);

    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    expect(screen.getByTestId("month-day-2026-07-05")).toHaveAttribute("data-density", "low");
    expect(screen.getByTestId("month-day-2026-07-10")).toHaveAttribute("data-density", "high");
    expect(screen.getByTestId("month-day-2026-07-20")).toHaveAttribute("data-density", "mid");

    // 2026-07-25 has zero occurrences within the rendered (July 2026) month -> hatched/grey.
    const zeroDay = screen.getByTestId("month-day-2026-07-25");
    expect(zeroDay).toHaveAttribute("data-density", "none");
    expect(zeroDay).toHaveAttribute("data-hatch", "true");

    // A day with occurrences is NOT hatched.
    expect(screen.getByTestId("month-day-2026-07-10")).toHaveAttribute("data-hatch", "false");
  });

  it("outlines today's cell", () => {
    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);
    // System time is 2026-07-15T18:00Z -> 13:00 America/Chicago on 2026-07-15.
    expect(screen.getByTestId("month-day-2026-07-15")).toHaveAttribute("data-today", "true");
    expect(screen.getByTestId("month-day-2026-07-16")).toHaveAttribute("data-today", "false");
  });
});

describe("MonthAvailabilityView — hover summary (backend times, settings tz, no coalesce)", () => {
  it("shows a day's net windows in settings tz on hover, rendered 1:1 (no merge/coalesce)", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    // Two adjacent windows on the same date — a naive coalescing implementation would merge these
    // into a single "9:00 AM – 11:00 AM" line. They must render as two separate lines.
    setResolved([
      { startAt: "2026-07-10T14:00:00Z", endAt: "2026-07-10T15:00:00Z" }, // 9:00-10:00 AM CDT
      { startAt: "2026-07-10T15:00:00Z", endAt: "2026-07-10T16:00:00Z" }, // 10:00-11:00 AM CDT
    ]);

    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    await user.hover(screen.getByTestId("month-day-2026-07-10"));

    const popover = await screen.findByRole("tooltip", { name: /availability for 2026-07-10/i });
    expect(screen.queryByText("9:00 AM – 11:00 AM")).not.toBeInTheDocument();
    expect(popover).toHaveTextContent("9:00 AM – 10:00 AM");
    expect(popover).toHaveTextContent("10:00 AM – 11:00 AM");
  });

  it("shows 'no availability' for a hovered zero-availability day", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    await user.hover(screen.getByTestId("month-day-2026-07-25"));

    const popover = await screen.findByRole("tooltip", { name: /availability for 2026-07-25/i });
    expect(popover).toHaveTextContent(/no availability/i);
  });

  it("moves the popover from one day to another on hover, and clears it on unhover", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    setResolved([
      { startAt: "2026-07-05T14:00:00Z", endAt: "2026-07-05T15:00:00Z" },
      { startAt: "2026-07-10T14:00:00Z", endAt: "2026-07-10T17:00:00Z" },
    ]);
    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    const dayA = screen.getByTestId("month-day-2026-07-05");
    const dayB = screen.getByTestId("month-day-2026-07-10");

    await user.hover(dayA);
    expect(
      await screen.findByRole("tooltip", { name: /availability for 2026-07-05/i }),
    ).toBeInTheDocument();

    await user.unhover(dayA);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.hover(dayB);
    expect(
      await screen.findByRole("tooltip", { name: /availability for 2026-07-10/i }),
    ).toBeInTheDocument();
  });
});

describe("MonthAvailabilityView — click invokes onOpenOverride", () => {
  it("calls onOpenOverride with the clicked day's ISO date", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onOpenOverride = jest.fn();
    render(<MonthAvailabilityView onOpenOverride={onOpenOverride} />);

    await user.click(screen.getByTestId("month-day-2026-07-22"));

    expect(onOpenOverride).toHaveBeenCalledWith("2026-07-22");
    expect(onOpenOverride).toHaveBeenCalledTimes(1);
  });
});

describe("MonthAvailabilityView — month navigation", () => {
  it("moves to the next/previous month and keeps rendering day cells", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    expect(screen.getByText("July 2026")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByText("August 2026")).toBeInTheDocument();
    expect(screen.getByTestId("month-day-2026-08-01")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /previous month/i }));
    await user.click(screen.getByRole("button", { name: /previous month/i }));
    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });
});
