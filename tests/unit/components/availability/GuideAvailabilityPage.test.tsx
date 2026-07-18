import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuideAvailabilityPage } from "@/components/availability/GuideAvailabilityPage";
import {
  ApiError,
  useAvailabilityExceptions,
  useAvailabilityRules,
  useAvailabilitySettings,
  useOverrideMultiPreview,
  useReplaceOverrides,
  useReplaceRules,
  useResolvedAvailability,
  useUpdateAvailabilityRule,
} from "@/lib/data-access";
import type {
  AvailabilityException,
  AvailabilityRule,
  AvailabilitySettings,
  ResolvedAvailability,
} from "@/lib/data-access";

// GuideAvailabilityPage (CTL-55 v2.1) assembles WeeklyHoursPanel / MonthAvailabilityView /
// UpcomingChangesList / DateOverrideModal / BookingRulesPanel — each of which is self-contained
// and calls these same data-access hooks directly (no callback props from the page for data), so
// this single module mock covers the whole rendered tree.
jest.mock("@/lib/data-access", () => ({
  useAvailabilityRules: jest.fn(),
  useAvailabilityExceptions: jest.fn(),
  useAvailabilitySettings: jest.fn(),
  useResolvedAvailability: jest.fn(),
  useUpdateAvailabilityRule: jest.fn(),
  useOverrideMultiPreview: jest.fn(),
  useReplaceRules: jest.fn(),
  useReplaceOverrides: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message?: string) {
      super(message ?? `HTTP ${status}`);
      this.status = status;
      this.name = "ApiError";
    }
  },
}));

const mockUseAvailabilityRules = useAvailabilityRules as jest.Mock;
const mockUseAvailabilityExceptions = useAvailabilityExceptions as jest.Mock;
const mockUseAvailabilitySettings = useAvailabilitySettings as jest.Mock;
const mockUseResolvedAvailability = useResolvedAvailability as jest.Mock;
const mockUseUpdateAvailabilityRule = useUpdateAvailabilityRule as jest.Mock;
const mockUseOverrideMultiPreview = useOverrideMultiPreview as jest.Mock;
const mockUseReplaceRules = useReplaceRules as jest.Mock;
const mockUseReplaceOverrides = useReplaceOverrides as jest.Mock;

const mondayRule: AvailabilityRule = {
  id: "rule-mon-1",
  dayOfWeek: 1,
  startLocal: "09:00",
  windowMin: 120,
  timezone: "America/Chicago",
  effectiveFrom: null,
  effectiveTo: null,
  active: true,
};

const sampleException: AvailabilityException = {
  id: "exc-1",
  exceptionDate: "2026-08-01",
  kind: "UNAVAILABLE",
  startLocal: "09:00",
  windowMin: 60,
  reason: "Doctor appointment",
};

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

const resolved: ResolvedAvailability = {
  rules: [mondayRule],
  occurrences: [{ startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T16:00:00Z" }],
  dstGapDays: [],
  bookable: true,
  hasWeeklyHours: true,
};

function setHooks(
  overrides: {
    rules?: Partial<ReturnType<typeof useAvailabilityRules>>;
    exceptions?: Partial<ReturnType<typeof useAvailabilityExceptions>>;
    settings?: Partial<ReturnType<typeof useAvailabilitySettings>>;
    resolved?: Partial<ReturnType<typeof useResolvedAvailability>>;
  } = {},
) {
  mockUseAvailabilityRules.mockReturnValue({
    data: [mondayRule],
    isLoading: false,
    isError: false,
    ...overrides.rules,
  });
  mockUseAvailabilityExceptions.mockReturnValue({
    data: [sampleException],
    isLoading: false,
    isError: false,
    ...overrides.exceptions,
  });
  mockUseAvailabilitySettings.mockReturnValue({
    data: sampleSettings,
    isLoading: false,
    isError: false,
    ...overrides.settings,
  });
  mockUseResolvedAvailability.mockReturnValue({
    data: resolved,
    isLoading: false,
    isError: false,
    ...overrides.resolved,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-07-15T18:00:00Z"));
  setHooks();
  mockUseUpdateAvailabilityRule.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseOverrideMultiPreview.mockReturnValue({
    data: undefined,
    isLoading: false,
    isFetching: false,
  });
  mockUseReplaceRules.mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue({ data: [], affectedBookings: [] }),
    isPending: false,
  });
  mockUseReplaceOverrides.mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue({ data: [], affectedBookings: [] }),
    isPending: false,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

function setupUser() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

describe("GuideAvailabilityPage — loading/error", () => {
  it("shows a loading state while any availability query is loading", () => {
    setHooks({ rules: { data: undefined, isLoading: true } });
    render(<GuideAvailabilityPage />);
    expect(screen.getByText(/loading availability/i)).toBeInTheDocument();
  });

  it("shows an error alert when any availability query fails", () => {
    setHooks({ resolved: { data: undefined, isError: true } });
    render(<GuideAvailabilityPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(/failed to load your availability/i);
  });
});

describe("GuideAvailabilityPage — assembled v2.1 layout", () => {
  it("renders the weekly editor, the month view, and the upcoming-changes list", () => {
    render(<GuideAvailabilityPage />);

    expect(screen.getByRole("list", { name: /weekly hours by day/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /bookable days/i })).toBeInTheDocument();
  });

  it("mobile view switch flips between calendar and weekly, keeping both panels mounted", async () => {
    const user = setupUser();
    render(<GuideAvailabilityPage />);

    const calendarBtn = screen.getByRole("button", { name: "Bookable days" });
    const weeklyBtn = screen.getByRole("button", { name: "Weekly hours" });

    // Calendar is the default (hero) view.
    expect(calendarBtn).toHaveAttribute("aria-pressed", "true");
    expect(weeklyBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(weeklyBtn);
    expect(weeklyBtn).toHaveAttribute("aria-pressed", "true");
    expect(calendarBtn).toHaveAttribute("aria-pressed", "false");

    // The switch is presentation-only: both panels stay in the DOM across the toggle.
    expect(screen.getByRole("list", { name: /weekly hours by day/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /bookable days/i })).toBeInTheDocument();
  });

  it("defaults the mobile switch to Weekly hours when no weekly hours are set yet", () => {
    // The "add weekly hours to start taking bookings" state (bookable=false, hasWeeklyHours=false):
    // the switch should land on the weekly editor so it points at the next step, not the calendar.
    setHooks({
      resolved: { data: { ...resolved, bookable: false, hasWeeklyHours: false } },
    });
    render(<GuideAvailabilityPage />);

    expect(screen.getByRole("button", { name: "Weekly hours" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Bookable days" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps the calendar default once no-hours guides tap to the calendar (manual choice wins)", async () => {
    const user = setupUser();
    setHooks({
      resolved: { data: { ...resolved, bookable: false, hasWeeklyHours: false } },
    });
    render(<GuideAvailabilityPage />);

    const calendarBtn = screen.getByRole("button", { name: "Bookable days" });
    await user.click(calendarBtn);
    expect(calendarBtn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Weekly hours" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("renders BookingRulesPanel from useAvailabilitySettings", () => {
    render(<GuideAvailabilityPage />);
    expect(screen.getByText("Booking rules")).toBeInTheDocument();
    expect(screen.getByText("AUTO")).toBeInTheDocument();
  });

  it("labels each workbench panel by its own title (no section eyebrows)", () => {
    render(<GuideAvailabilityPage />);

    // Variant B drops the section eyebrows (Step 1 / Step 2 and the booking-policy label) — each
    // panel's own heading labels it instead.
    expect(screen.queryByText(/set your weekly hours/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/review your availability calendar/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Weekly hours" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bookable days" })).toBeInTheDocument();
  });

  it("keeps the booking-rules aside in normal flow (not sticky)", () => {
    render(<GuideAvailabilityPage />);
    const aside = screen.getByRole("complementary");
    expect(aside).not.toHaveClass("lg:sticky");
    expect(aside).not.toHaveClass("lg:top-6");
  });

  it("omits BookingRulesPanel while settings data is unavailable", () => {
    setHooks({ settings: { data: undefined, isLoading: false, isError: false } });
    render(<GuideAvailabilityPage />);
    expect(screen.queryByText("Booking rules")).not.toBeInTheDocument();
  });

  it("does not render the override modal until a month day is clicked", () => {
    render(<GuideAvailabilityPage />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("GuideAvailabilityPage — month click opens the override modal", () => {
  it("clicking a month day opens DateOverrideModal preselected with that ISO date", async () => {
    const user = setupUser();
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByTestId("calendar-day-2026-07-22"));

    const dialog = await screen.findByRole("dialog");
    // 2026-07-22 is a Wednesday; the title carries the weekday + M/D.
    expect(
      within(dialog).getByRole("heading", { name: /Date-specific hours · Wednesday, Jul 22/ }),
    ).toBeInTheDocument();
    // DateOverrideModal defaults to "Block time off" (UNAVAILABLE) — that segment is filled.
    expect(within(dialog).getByRole("button", { name: "Block time off" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Single-day editor — no date-range pickers.
    expect(within(dialog).queryByLabelText("From date")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("To date")).not.toBeInTheDocument();
  });

  it("closes the override modal via its own Cancel button", async () => {
    const user = setupUser();
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByTestId("calendar-day-2026-07-22"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("with no weekly hours, a desktop day click shows a notice by the calendar and never opens the modal", async () => {
    const user = setupUser();
    setHooks({
      resolved: { data: { ...resolved, bookable: false, hasWeeklyHours: false } },
    });
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByTestId("calendar-day-2026-07-22"));

    // Desktop blocks the override modal before it opens and surfaces a notice instead.
    expect(screen.getByText(/set your weekly hours first/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("GuideAvailabilityPage — readiness notice (B1, two-signal)", () => {
  it("shows no readiness notice when bookable is true", () => {
    setHooks({ resolved: { data: { ...resolved, bookable: true, hasWeeklyHours: true } } });
    render(<GuideAvailabilityPage />);

    expect(screen.queryByText(/can't book you/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no upcoming openings/i)).not.toBeInTheDocument();
  });

  it("nudges to add weekly hours when not bookable and no weekly hours are set", () => {
    setHooks({ resolved: { data: { ...resolved, bookable: false, hasWeeklyHours: false } } });
    render(<GuideAvailabilityPage />);

    expect(
      screen.getByText(
        /you haven't set any availability yet, so participants can't book you\. add weekly hours to start taking bookings\./i,
      ),
    ).toBeInTheDocument();
  });

  it("points to overrides/blocks when weekly hours exist but there are no upcoming openings", () => {
    setHooks({ resolved: { data: { ...resolved, bookable: false, hasWeeklyHours: true } } });
    render(<GuideAvailabilityPage />);

    expect(
      screen.getByText(
        /your weekly hours have no upcoming openings — check your date overrides or blocks so participants can book you\./i,
      ),
    ).toBeInTheDocument();
  });
});

describe("GuideAvailabilityPage — write 422 surfaces as an in-dialog notification", () => {
  it("a replace-overrides 422 from the override modal's Confirm keeps it open and shows the backend message", async () => {
    const user = setupUser();
    const replaceMutate = jest
      .fn()
      .mockRejectedValue(new ApiError(422, "This override conflicts with an existing booking."));
    mockUseReplaceOverrides.mockReturnValue({
      mutateAsync: replaceMutate,
      isPending: false,
    });
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByTestId("calendar-day-2026-07-22"));
    const dialog = await screen.findByRole("dialog");

    // 2026-07-22 has no existing override → empty editor; add a slot so Confirm issues an atomic
    // replace (DateOverrideModal's save goes through useReplaceOverrides).
    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));
    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    await waitFor(() => expect(replaceMutate).toHaveBeenCalledTimes(1));
    expect(
      await within(dialog).findByText(/this override conflicts with an existing booking/i),
    ).toBeInTheDocument();
    // Stays open — the notification lives inside the still-open dialog, not a page-level banner.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("GuideAvailabilityPage — mobile day-sheet flow (tap → sheet → editor → back)", () => {
  function mockTouch() {
    window.matchMedia = jest.fn().mockImplementation((q: string) => ({
      matches: true,
      media: q,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  }

  afterEach(() => {
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it("Cancel in the editor returns to the day sheet instead of closing everything", async () => {
    mockTouch();
    const user = setupUser();
    render(<GuideAvailabilityPage />);

    // Tap a day → the detail sheet (not the editor).
    await user.click(screen.getByTestId("calendar-day-2026-07-22"));
    expect(
      screen.getByRole("dialog", { name: /Availability for 2026-07-22/i }),
    ).toBeInTheDocument();

    // Add override → the editor opens (the sheet is swapped out).
    await user.click(screen.getByRole("button", { name: "Add override" }));
    const editor = await screen.findByRole("dialog", { name: "Date-specific hours" });
    expect(editor).toBeInTheDocument();

    // Cancel → back to the day sheet, not all the way out to the calendar.
    await user.click(within(editor).getByRole("button", { name: /cancel/i }));
    expect(
      screen.getByRole("dialog", { name: /Availability for 2026-07-22/i }),
    ).toBeInTheDocument();
  });
});
