import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuideAvailabilityPage } from "@/components/availability/GuideAvailabilityPage";
import {
  ApiError,
  useAvailabilityExceptions,
  useAvailabilityRules,
  useAvailabilitySettings,
  useCreateAvailabilityException,
  useCreateAvailabilityRule,
  useDeleteAvailabilityRule,
  useOverridePreview,
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
  useCreateAvailabilityRule: jest.fn(),
  useDeleteAvailabilityRule: jest.fn(),
  useOverridePreview: jest.fn(),
  useCreateAvailabilityException: jest.fn(),
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
const mockUseCreateAvailabilityRule = useCreateAvailabilityRule as jest.Mock;
const mockUseDeleteAvailabilityRule = useDeleteAvailabilityRule as jest.Mock;
const mockUseOverridePreview = useOverridePreview as jest.Mock;
const mockUseCreateAvailabilityException = useCreateAvailabilityException as jest.Mock;

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
  mockUseCreateAvailabilityRule.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseDeleteAvailabilityRule.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseOverridePreview.mockReturnValue({ data: undefined, isLoading: false, isFetching: false });
  mockUseCreateAvailabilityException.mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
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
    expect(screen.getByRole("region", { name: /actual availability/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /upcoming changes/i })).toBeInTheDocument();
  });

  it("renders BookingRulesPanel from useAvailabilitySettings", () => {
    render(<GuideAvailabilityPage />);
    expect(screen.getByText("Booking rules")).toBeInTheDocument();
    expect(screen.getByText("AUTO")).toBeInTheDocument();
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

    await user.click(screen.getByTestId("month-day-2026-07-22"));

    const dialog = await screen.findByRole("dialog");
    // DateOverrideModal defaults to "Block time off" (UNAVAILABLE) mode.
    expect(within(dialog).getByRole("heading", { name: /block time off/i })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("From date")).toHaveValue("2026-07-22");
    expect(within(dialog).getByLabelText("To date")).toHaveValue("2026-07-22");
  });

  it("closes the override modal via its own Cancel button", async () => {
    const user = setupUser();
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByTestId("month-day-2026-07-22"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("GuideAvailabilityPage — write 422 surfaces as an in-dialog notification", () => {
  it("a create 422 from the override modal's Confirm keeps it open and shows the backend message", async () => {
    const user = setupUser();
    const createMutate = jest
      .fn()
      .mockRejectedValue(new ApiError(422, "This override conflicts with an existing booking."));
    mockUseCreateAvailabilityException.mockReturnValue({
      mutateAsync: createMutate,
      isPending: false,
    });
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByTestId("month-day-2026-07-22"));
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(
      await within(dialog).findByText(/this override conflicts with an existing booking/i),
    ).toBeInTheDocument();
    // Stays open — the notification lives inside the still-open dialog, not a page-level banner.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
