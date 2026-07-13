import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthAvailabilityView } from "@/components/availability/MonthAvailabilityView";
import {
  useAvailabilityExceptions,
  useAvailabilitySettings,
  useResolvedAvailability,
} from "@/lib/data-access";
import type {
  AvailabilityException,
  AvailabilitySettings,
  ResolvedAvailability,
} from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useResolvedAvailability: jest.fn(),
  useAvailabilitySettings: jest.fn(),
  useAvailabilityExceptions: jest.fn(),
}));

const mockUseResolvedAvailability = useResolvedAvailability as jest.Mock;
const mockUseAvailabilitySettings = useAvailabilitySettings as jest.Mock;
const mockUseAvailabilityExceptions = useAvailabilityExceptions as jest.Mock;

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

// All times below are UTC instants that land on the given settings-tz (America/Chicago,
// UTC-5 in July) calendar date — chosen mid-day so no DST/tz edge shifts the bucket,
// except the explicitly-labelled boundary case.
function resolved(occurrences: ResolvedAvailability["occurrences"]): ResolvedAvailability {
  return { rules: [], occurrences, dstGapDays: [], bookable: true, hasWeeklyHours: true };
}

function setResolved(occurrences: ResolvedAvailability["occurrences"]) {
  mockUseResolvedAvailability.mockReturnValue({
    data: resolved(occurrences),
    isLoading: false,
    isError: false,
  });
}

function setExceptions(exceptions: AvailabilityException[]) {
  mockUseAvailabilityExceptions.mockReturnValue({
    data: exceptions,
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
  setExceptions([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("MonthAvailabilityView — density bar + hatch", () => {
  it("renders a density bar on days with occurrences and hatches a zero-availability day", () => {
    setResolved([
      { startAt: "2026-07-05T14:00:00Z", endAt: "2026-07-05T15:00:00Z" },
      { startAt: "2026-07-10T14:00:00Z", endAt: "2026-07-10T17:00:00Z" },
    ]);

    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    // Days with occurrences get a density bar and are NOT muted.
    expect(screen.getByTestId("density-2026-07-05")).toBeInTheDocument();
    expect(screen.getByTestId("density-2026-07-10")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-day-2026-07-10")).toHaveAttribute("data-muted", "false");

    // A zero-availability day is hatched (muted) with no density bar.
    const zeroDay = screen.getByTestId("calendar-day-2026-07-25");
    expect(zeroDay).toHaveAttribute("data-muted", "true");
    expect(zeroDay.className).toContain("calendar-hatch");
    expect(screen.queryByTestId("density-2026-07-25")).not.toBeInTheDocument();
  });

  it("flags a day with an ADDITIONAL exception as additional (blue) on the density bar", () => {
    // 2026-07-17T19:00Z = 14:00 CDT -> matches the ADDITIONAL exception's startLocal "14:00".
    setResolved([{ startAt: "2026-07-17T19:00:00Z", endAt: "2026-07-17T20:00:00Z" }]);
    setExceptions([
      {
        id: "e1",
        exceptionDate: "2026-07-17",
        kind: "ADDITIONAL",
        startLocal: "14:00",
        windowMin: 60,
        reason: null,
      },
    ]);

    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    expect(screen.getByTestId("density-2026-07-17")).toHaveAttribute("data-additional", "true");
    // A day with occurrences but no ADDITIONAL exception is not flagged additional.
    expect(screen.getByTestId("calendar-day-2026-07-17")).toHaveAttribute("data-muted", "false");
  });

  it("outlines today's cell", () => {
    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);
    // System time 2026-07-15T18:00Z -> 13:00 America/Chicago on 2026-07-15.
    expect(screen.getByTestId("calendar-day-2026-07-15")).toHaveAttribute("data-today", "true");
    expect(screen.getByTestId("calendar-day-2026-07-16")).toHaveAttribute("data-today", "false");
  });
});

describe("MonthAvailabilityView — hover summary (backend times, settings tz, no coalesce)", () => {
  it("shows a day's net windows in settings tz on hover, rendered 1:1 (no merge/coalesce)", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    // Two adjacent windows on the same date — a naive coalescer would merge them into one
    // "9:00 AM – 11:00 AM" line. They must render as two separate lines.
    setResolved([
      { startAt: "2026-07-10T14:00:00Z", endAt: "2026-07-10T15:00:00Z" }, // 9-10 AM CDT
      { startAt: "2026-07-10T15:00:00Z", endAt: "2026-07-10T16:00:00Z" }, // 10-11 AM CDT
    ]);

    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    await user.hover(screen.getByTestId("calendar-day-2026-07-10"));

    const popover = await screen.findByRole("tooltip", { name: /availability for 2026-07-10/i });
    expect(popover).toHaveTextContent(/Fri 7\/10 · Available/);
    expect(screen.queryByText("9:00 AM – 11:00 AM")).not.toBeInTheDocument();
    expect(popover).toHaveTextContent("9:00 AM – 10:00 AM");
    expect(popover).toHaveTextContent("10:00 AM – 11:00 AM");
    // Backend-resolved note, in English.
    expect(popover).toHaveTextContent(/not recomputed/i);
  });

  it("labels the ADDITIONAL window row 'Extra' in the hover summary", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    setResolved([
      { startAt: "2026-07-17T14:00:00Z", endAt: "2026-07-17T15:00:00Z" }, // 9-10 AM CDT (normal)
      { startAt: "2026-07-17T19:00:00Z", endAt: "2026-07-17T20:00:00Z" }, // 14:00 CDT (extra)
    ]);
    setExceptions([
      {
        id: "e1",
        exceptionDate: "2026-07-17",
        kind: "ADDITIONAL",
        startLocal: "14:00",
        windowMin: 60,
        reason: null,
      },
    ]);

    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    await user.hover(screen.getByTestId("calendar-day-2026-07-17"));
    const popover = await screen.findByRole("tooltip", { name: /availability for 2026-07-17/i });

    expect(popover).toHaveTextContent("2:00 PM – 3:00 PM");
    expect(popover).toHaveTextContent("Extra");
    // The normal 9 AM window is present and not labelled Extra by itself.
    expect(popover).toHaveTextContent("9:00 AM – 10:00 AM");
  });

  it("still labels a trimmed ADDITIONAL window 'Extra' when its start no longer matches the exception", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    // The ADDITIONAL exception is 14:00–16:00 CDT, but the backend trimmed its start to 14:30 because
    // 14:00–14:30 was already covered by weekly hours. The resolved window (14:30–16:00) no longer
    // starts at the exception's 14:00 startLocal — a raw start-time match would silently drop the
    // "Extra" accent. The accent must survive the trim (derived from interval coverage, not equality).
    setResolved([{ startAt: "2026-07-17T19:30:00Z", endAt: "2026-07-17T21:00:00Z" }]); // 14:30–16:00 CDT
    setExceptions([
      {
        id: "e1",
        exceptionDate: "2026-07-17",
        kind: "ADDITIONAL",
        startLocal: "14:00",
        windowMin: 120,
        reason: null,
      },
    ]);

    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    await user.hover(screen.getByTestId("calendar-day-2026-07-17"));
    const popover = await screen.findByRole("tooltip", { name: /availability for 2026-07-17/i });

    expect(popover).toHaveTextContent("2:30 PM – 4:00 PM");
    expect(popover).toHaveTextContent("Extra");
  });

  it("shows 'No hours' / 'Unavailable' for a hovered zero-availability day", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    await user.hover(screen.getByTestId("calendar-day-2026-07-25"));

    const popover = await screen.findByRole("tooltip", { name: /availability for 2026-07-25/i });
    expect(popover).toHaveTextContent(/Unavailable/);
    expect(popover).toHaveTextContent(/No hours/i);
  });

  it("moves the popover between days on hover and clears it on unhover", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    setResolved([
      { startAt: "2026-07-05T14:00:00Z", endAt: "2026-07-05T15:00:00Z" },
      { startAt: "2026-07-10T14:00:00Z", endAt: "2026-07-10T17:00:00Z" },
    ]);
    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    const dayA = screen.getByTestId("calendar-day-2026-07-05");
    const dayB = screen.getByTestId("calendar-day-2026-07-10");

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

describe("MonthAvailabilityView — settings-tz bucketing", () => {
  it("buckets an occurrence to its settings-tz date across a UTC-day boundary", () => {
    // 2026-07-11T02:00Z = 2026-07-10 21:00 America/Chicago -> belongs to 07-10, not 07-11.
    setResolved([{ startAt: "2026-07-11T02:00:00Z", endAt: "2026-07-11T03:00:00Z" }]);

    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    expect(screen.getByTestId("density-2026-07-10")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-day-2026-07-11")).toHaveAttribute("data-muted", "true");
  });
});

describe("MonthAvailabilityView — click invokes onOpenOverride", () => {
  it("calls onOpenOverride with the clicked day's ISO date", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onOpenOverride = jest.fn();
    render(<MonthAvailabilityView onOpenOverride={onOpenOverride} />);

    await user.click(screen.getByTestId("calendar-day-2026-07-22"));

    expect(onOpenOverride).toHaveBeenCalledWith("2026-07-22");
    expect(onOpenOverride).toHaveBeenCalledTimes(1);
  });
});

describe("MonthAvailabilityView — Sunday-first week", () => {
  it("renders the weekday header row Sunday-first (SUN … SAT)", () => {
    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);
    const heads = screen.getAllByRole("columnheader").map((el) => el.textContent);
    expect(heads).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });
});

describe("MonthAvailabilityView — self-sufficient month cursor", () => {
  it("seeds the current month from the settings tz even when settings resolve after first render", () => {
    // Render order without the page gate: settings is still loading on the first render, so the
    // fallback tz (America/Los_Angeles) is in effect, then the real settings tz resolves. At this
    // instant LA is still 2026-07-31 but Pacific/Kiritimati (UTC+14) is already 2026-08-01, so a
    // cursor frozen at mount-time from the fallback tz would wrongly stick on July.
    jest.setSystemTime(new Date("2026-07-31T12:00:00Z"));
    mockUseAvailabilitySettings.mockReset();
    mockUseAvailabilitySettings
      .mockReturnValueOnce({ data: undefined, isLoading: true, isError: false })
      .mockReturnValue({
        data: { ...sampleSettings, timezone: "Pacific/Kiritimati" },
        isLoading: false,
        isError: false,
      });

    const { rerender } = render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);
    rerender(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    expect(screen.getByText("August 2026")).toBeInTheDocument();
  });
});

describe("MonthAvailabilityView — month navigation", () => {
  it("moves to the next/previous month and keeps rendering day cells", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MonthAvailabilityView onOpenOverride={jest.fn()} />);

    expect(screen.getByText("July 2026")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByText("August 2026")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-day-2026-08-01")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /previous month/i }));
    await user.click(screen.getByRole("button", { name: /previous month/i }));
    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });
});
