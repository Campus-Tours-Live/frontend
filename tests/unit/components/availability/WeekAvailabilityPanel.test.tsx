import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeekAvailabilityPanel } from "@/components/availability/WeekAvailabilityPanel";
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

const mockResolved = useResolvedAvailability as jest.Mock;
const mockSettings = useAvailabilitySettings as jest.Mock;
const mockExceptions = useAvailabilityExceptions as jest.Mock;

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

function setResolved(occurrences: ResolvedAvailability["occurrences"]) {
  mockResolved.mockReturnValue({
    data: { rules: [], occurrences, dstGapDays: [], bookable: true, hasWeeklyHours: true },
    isLoading: false,
    isError: false,
  });
}

function setExceptions(exceptions: AvailabilityException[]) {
  mockExceptions.mockReturnValue({ data: exceptions, isLoading: false, isError: false });
}

function setupUser() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // Today (settings-tz America/Chicago) = 2026-07-16, a Thursday. Its week is Sun 07-12 … Sat 07-18.
  jest.setSystemTime(new Date("2026-07-16T18:00:00Z"));
  mockSettings.mockReturnValue({ data: sampleSettings, isLoading: false, isError: false });
  setResolved([]);
  setExceptions([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("WeekAvailabilityPanel", () => {
  it("defaults to today and renders today's resolved windows", () => {
    // 14:00Z–16:00Z on 2026-07-16 in America/Chicago (CDT, UTC-5) → 9:00–11:00 AM.
    setResolved([{ startAt: "2026-07-16T14:00:00Z", endAt: "2026-07-16T16:00:00Z" }]);
    render(<WeekAvailabilityPanel />);

    const region = screen.getByRole("region", { name: "Availability by day" });
    expect(within(region).getByRole("heading", { name: /Thursday, Jul 16/ })).toBeInTheDocument();
    expect(within(region).getByText("Today")).toBeInTheDocument();
    expect(within(region).getByText("9:00 AM – 11:00 AM")).toBeInTheDocument();
  });

  it("steps to the previous/next day within the week via the chevrons", async () => {
    const user = setupUser();
    setResolved([{ startAt: "2026-07-15T14:00:00Z", endAt: "2026-07-15T16:00:00Z" }]); // Wed 07-15
    render(<WeekAvailabilityPanel />);

    const region = screen.getByRole("region", { name: "Availability by day" });
    // Today (Thu 07-16) has no windows.
    expect(within(region).getByText(/no hours this day/i)).toBeInTheDocument();

    await user.click(within(region).getByRole("button", { name: "Previous day" }));
    // Now on Wed 07-15, which has a window; the "Today" tag is gone.
    expect(within(region).getByRole("heading", { name: /Wednesday, Jul 15/ })).toBeInTheDocument();
    expect(within(region).queryByText("Today")).not.toBeInTheDocument();
    expect(within(region).getByText("9:00 AM – 11:00 AM")).toBeInTheDocument();

    await user.click(within(region).getByRole("button", { name: "Next day" }));
    expect(within(region).getByRole("heading", { name: /Thursday, Jul 16/ })).toBeInTheDocument();
  });

  it("bounds navigation to the current week (Sun–Sat)", async () => {
    const user = setupUser();
    render(<WeekAvailabilityPanel />);
    const region = screen.getByRole("region", { name: "Availability by day" });
    const prev = () => within(region).getByRole("button", { name: "Previous day" });
    const next = () => within(region).getByRole("button", { name: "Next day" });

    // From Thu 07-16, step back to Sun 07-12 (the week start) — 4 steps — then prev is disabled.
    for (let i = 0; i < 4; i++) await user.click(prev());
    expect(within(region).getByRole("heading", { name: /Sunday, Jul 12/ })).toBeInTheDocument();
    expect(prev()).toBeDisabled();

    // Forward to Sat 07-18 (the week end) — 6 steps — then next is disabled.
    for (let i = 0; i < 6; i++) await user.click(next());
    expect(within(region).getByRole("heading", { name: /Saturday, Jul 18/ })).toBeInTheDocument();
    expect(next()).toBeDisabled();
  });

  it("renders 'No hours this day' while resolvedQuery/exceptionsQuery data are still loading", () => {
    // Both queries loading (data undefined) — the `?? []` fallbacks on occurrences/exceptions must
    // keep the panel rendering (empty-day state) instead of throwing on an undefined array.
    mockResolved.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    mockExceptions.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<WeekAvailabilityPanel />);

    const region = screen.getByRole("region", { name: "Availability by day" });
    expect(within(region).getByText(/no hours this day/i)).toBeInTheDocument();
  });

  it("flags an ADDITIONAL-covered window as Extra", () => {
    setResolved([{ startAt: "2026-07-16T14:00:00Z", endAt: "2026-07-16T16:00:00Z" }]);
    setExceptions([
      {
        id: "e1",
        exceptionDate: "2026-07-16",
        kind: "ADDITIONAL",
        startLocal: "09:00",
        windowMin: 120,
        reason: null,
      },
    ]);
    render(<WeekAvailabilityPanel />);

    expect(screen.getByText("Extra")).toBeInTheDocument();
  });
});
