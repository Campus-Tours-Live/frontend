import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuideAvailabilityPage } from "@/components/availability/GuideAvailabilityPage";
import {
  useAvailabilityExceptions,
  useAvailabilityRules,
  useAvailabilitySettings,
  useCreateAvailabilityException,
  useCreateAvailabilityRule,
  useDeleteAvailabilityException,
  useDeleteAvailabilityRule,
  useResolvedAvailability,
  useUpdateAvailabilityException,
  useUpdateAvailabilityRule,
} from "@/lib/data-access";
import type {
  AvailabilityException,
  AvailabilityRule,
  AvailabilitySettings,
  ResolvedAvailability,
} from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useAvailabilityRules: jest.fn(),
  useAvailabilityExceptions: jest.fn(),
  useAvailabilitySettings: jest.fn(),
  useResolvedAvailability: jest.fn(),
  useCreateAvailabilityRule: jest.fn(),
  useUpdateAvailabilityRule: jest.fn(),
  useDeleteAvailabilityRule: jest.fn(),
  useCreateAvailabilityException: jest.fn(),
  useUpdateAvailabilityException: jest.fn(),
  useDeleteAvailabilityException: jest.fn(),
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
const mockUseCreateAvailabilityRule = useCreateAvailabilityRule as jest.Mock;
const mockUseUpdateAvailabilityRule = useUpdateAvailabilityRule as jest.Mock;
const mockUseDeleteAvailabilityRule = useDeleteAvailabilityRule as jest.Mock;
const mockUseCreateAvailabilityException = useCreateAvailabilityException as jest.Mock;
const mockUseUpdateAvailabilityException = useUpdateAvailabilityException as jest.Mock;
const mockUseDeleteAvailabilityException = useDeleteAvailabilityException as jest.Mock;

// Two rules that overlap on Monday: 9:00–11:00 (120min) and 10:00–11:00 (60min). The FE must
// render them as TWO separate editable/deletable bars — never merge/coalesce on the client.
const overlappingRuleA: AvailabilityRule = {
  id: "rule-a",
  dayOfWeek: 1,
  startLocal: "09:00",
  windowMin: 120,
  timezone: "America/Chicago",
  effectiveFrom: null,
  effectiveTo: null,
  active: true,
};
const overlappingRuleB: AvailabilityRule = {
  id: "rule-b",
  dayOfWeek: 1,
  startLocal: "10:00",
  windowMin: 60,
  timezone: "America/Chicago",
  effectiveFrom: null,
  effectiveTo: null,
  active: true,
};

const sampleException: AvailabilityException = {
  id: "exc-1",
  exceptionDate: "2026-03-10",
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

// The backend-resolved read: a single coalesced occurrence spanning the union of the two
// overlapping rules above (9:00–11:00 Chicago time on 2026-03-09, a Monday).
const mergedResolved: ResolvedAvailability = {
  rules: [overlappingRuleA, overlappingRuleB],
  occurrences: [{ startAt: "2026-03-09T15:00:00Z", endAt: "2026-03-09T17:00:00Z" }],
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
    data: [overlappingRuleA, overlappingRuleB],
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
    data: mergedResolved,
    isLoading: false,
    isError: false,
    ...overrides.resolved,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setHooks();
  mockUseCreateAvailabilityRule.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseUpdateAvailabilityRule.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseDeleteAvailabilityRule.mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
    variables: undefined,
  });
  mockUseCreateAvailabilityException.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseUpdateAvailabilityException.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseDeleteAvailabilityException.mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
    variables: undefined,
  });
});

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

describe("GuideAvailabilityPage — per-rule bars (no client coalescing)", () => {
  it("renders two overlapping rules on the same day as two distinct editable/deletable bars", () => {
    render(<GuideAvailabilityPage />);

    // Both windows are visible as separate bars — proof the FE does not merge them.
    expect(screen.getByText("9:00 AM · 2h")).toBeInTheDocument();
    expect(screen.getByText("10:00 AM · 1h")).toBeInTheDocument();

    expect(
      screen.getAllByRole("button", { name: /^Edit 9:00 AM · 2h|^Edit 10:00 AM · 1h/ }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: /^Remove 9:00 AM · 2h|^Remove 10:00 AM · 1h/ }),
    ).toHaveLength(2);
  });

  it("shows 'Unavailable' for a day with no rules", () => {
    render(<GuideAvailabilityPage />);
    // Sunday (index 0) has no rules in the fixture data.
    const weeklyList = screen.getByRole("list", { name: /weekly hours by day/i });
    expect(within(weeklyList).getAllByText("Unavailable").length).toBeGreaterThan(0);
  });

  it("dims an inactive rule's bar", () => {
    setHooks({ rules: { data: [{ ...overlappingRuleA, active: false }] } });
    render(<GuideAvailabilityPage />);
    expect(screen.getByText("9:00 AM · 2h").closest("div")).toHaveClass("opacity-60");
  });

  it("disables Remove on the rule currently being deleted", () => {
    mockUseDeleteAvailabilityRule.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: true,
      variables: "rule-a",
    });
    render(<GuideAvailabilityPage />);
    expect(screen.getByRole("button", { name: "Remove 9:00 AM · 2h on Monday" })).toBeDisabled();
  });
});

describe("GuideAvailabilityPage — backend-resolved preview (read-only, never re-coalesced)", () => {
  it("renders the resolved merged occurrence as a single span, not the two source rules", () => {
    render(<GuideAvailabilityPage />);

    const preview = screen.getByRole("region", { name: /actual availability/i });
    const items = within(preview).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    // Formatted in the guide's settings timezone (America/Chicago is UTC-5/CDT by 2026-03-09,
    // the Monday after that year's spring-forward).
    expect(items[0]).toHaveTextContent("10:00 AM");
    expect(items[0]).toHaveTextContent("12:00 PM");
  });

  it("shows a guide-visible DST notice when dstGapDays is non-empty", () => {
    setHooks({
      resolved: {
        data: { ...mergedResolved, dstGapDays: ["2026-03-08"] },
      },
    });
    render(<GuideAvailabilityPage />);

    const notice = screen.getByText(/daylight-saving/i);
    expect(notice).toHaveTextContent("2026-03-08");
  });

  it("does not show a DST notice when dstGapDays is empty", () => {
    render(<GuideAvailabilityPage />);
    expect(screen.queryByText(/daylight-saving/i)).not.toBeInTheDocument();
  });
});

describe("GuideAvailabilityPage — rule modals", () => {
  it("opens a prefilled RuleFormModal when Edit is clicked on a rule bar", async () => {
    const user = userEvent.setup();
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: "Edit 9:00 AM · 2h on Monday" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Edit hours" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Start time")).toHaveValue("09:00");
    expect(within(dialog).getByLabelText("Weekday")).toHaveValue("1");
  });

  it("opens a blank RuleFormModal for the clicked day when Add is clicked", async () => {
    const user = userEvent.setup();
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: /add hours on tuesday/i }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Add hours · Tuesday" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Start time")).toHaveValue("09:00");
  });

  it("passes the settings timezone into RuleFormModal, read-only", async () => {
    const user = userEvent.setup();
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: /add hours on tuesday/i }));

    const dialog = screen.getByRole("dialog");
    const tzField = within(dialog).getByLabelText("Timezone") as HTMLInputElement;
    expect(tzField).toHaveValue("America/Chicago");
    expect(tzField).toBeDisabled();
  });

  it("closes the RuleFormModal via its own Cancel button", async () => {
    const user = userEvent.setup();
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: /add hours on tuesday/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("submits a new rule through RuleFormModal, calling the create mutation", async () => {
    const user = userEvent.setup();
    const createMutate = jest.fn().mockResolvedValue(undefined);
    mockUseCreateAvailabilityRule.mockReturnValue({ mutateAsync: createMutate, isPending: false });
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: /add hours on tuesday/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Add hours" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ dayOfWeek: 2, startLocal: "09:00", windowMin: 60 }),
    );
  });

  it("submits an edited rule through RuleFormModal, calling the update mutation with { id, body }", async () => {
    const user = userEvent.setup();
    const updateMutate = jest.fn().mockResolvedValue(undefined);
    mockUseUpdateAvailabilityRule.mockReturnValue({ mutateAsync: updateMutate, isPending: false });
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: "Edit 9:00 AM · 2h on Monday" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate).toHaveBeenCalledWith({
      id: "rule-a",
      body: expect.objectContaining({ startLocal: "09:00", windowMin: 120 }),
    });
  });

  it("surfaces a rule form error when the create mutation rejects", async () => {
    const user = userEvent.setup();
    const createMutate = jest.fn().mockRejectedValue(new Error("nope"));
    mockUseCreateAvailabilityRule.mockReturnValue({ mutateAsync: createMutate, isPending: false });
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: /add hours on tuesday/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Add hours" }));

    expect(await within(dialog).findByText(/could not save recurring hours/i)).toBeInTheDocument();
  });
});

describe("GuideAvailabilityPage — delete flow", () => {
  it("opens the ConfirmDeleteModal when Remove is clicked, and Cancel closes it without deleting", async () => {
    const user = userEvent.setup();
    const deleteMutate = jest.fn();
    mockUseDeleteAvailabilityRule.mockReturnValue({
      mutateAsync: deleteMutate,
      isPending: false,
      variables: undefined,
    });
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: "Remove 9:00 AM · 2h on Monday" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/remove recurring hours/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteMutate).not.toHaveBeenCalled();
  });

  it("confirms deleting a rule by calling useDeleteAvailabilityRule with the rule id", async () => {
    const user = userEvent.setup();
    const deleteMutate = jest.fn().mockResolvedValue(undefined);
    mockUseDeleteAvailabilityRule.mockReturnValue({
      mutateAsync: deleteMutate,
      isPending: false,
      variables: undefined,
    });
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: "Remove 9:00 AM · 2h on Monday" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(deleteMutate).toHaveBeenCalledWith("rule-a");
  });

  it("shows a delete-error message when the confirmed delete fails", async () => {
    const user = userEvent.setup();
    const deleteMutate = jest.fn().mockRejectedValue(new Error("boom"));
    mockUseDeleteAvailabilityRule.mockReturnValue({
      mutateAsync: deleteMutate,
      isPending: false,
      variables: undefined,
    });
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: "Remove 9:00 AM · 2h on Monday" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(await screen.findByText(/could not remove recurring hours/i)).toBeInTheDocument();
  });
});

describe("GuideAvailabilityPage — exceptions panel", () => {
  it("renders date-specific exceptions with kind + window, and wires Add/Edit/Delete", async () => {
    const user = userEvent.setup();
    render(<GuideAvailabilityPage />);

    const exceptionsList = screen.getByRole("list", { name: /^date-specific hours$/i });
    expect(within(exceptionsList).getByText("9:00 AM · 1h")).toBeInTheDocument();
    expect(within(exceptionsList).getByText(/unavailable/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /edit date-specific hours/i }));
    let dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Edit date-specific hours" }),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: /^add date-specific hours$/i }));
    dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Add date-specific hours" }),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: /remove date-specific hours/i }));
    dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/remove date-specific hours/i)).toBeInTheDocument();
  });

  it("submits a new exception through ExceptionFormModal, calling the create mutation", async () => {
    const user = userEvent.setup();
    const createMutate = jest.fn().mockResolvedValue(undefined);
    mockUseCreateAvailabilityException.mockReturnValue({
      mutateAsync: createMutate,
      isPending: false,
    });
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: /^add date-specific hours$/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Add exception" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
  });

  it("submits an edited exception through ExceptionFormModal, calling the update mutation with { id, body }", async () => {
    const user = userEvent.setup();
    const updateMutate = jest.fn().mockResolvedValue(undefined);
    mockUseUpdateAvailabilityException.mockReturnValue({
      mutateAsync: updateMutate,
      isPending: false,
    });
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: /edit date-specific hours/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate).toHaveBeenCalledWith({
      id: "exc-1",
      body: expect.objectContaining({ exceptionDate: "2026-03-10" }),
    });
  });

  it("surfaces an exception form error when the create mutation rejects", async () => {
    const user = userEvent.setup();
    const createMutate = jest.fn().mockRejectedValue(new Error("nope"));
    mockUseCreateAvailabilityException.mockReturnValue({
      mutateAsync: createMutate,
      isPending: false,
    });
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: /^add date-specific hours$/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Add exception" }));

    expect(await within(dialog).findByText(/could not save the exception/i)).toBeInTheDocument();
  });

  it("confirms deleting an exception by calling useDeleteAvailabilityException with the exception id", async () => {
    const user = userEvent.setup();
    const deleteMutate = jest.fn().mockResolvedValue(undefined);
    mockUseDeleteAvailabilityException.mockReturnValue({
      mutateAsync: deleteMutate,
      isPending: false,
      variables: undefined,
    });
    render(<GuideAvailabilityPage />);

    await user.click(screen.getByRole("button", { name: /remove date-specific hours/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(deleteMutate).toHaveBeenCalledWith("exc-1");
  });

  it("renders an ADDITIONAL exception without a reason, and disables Remove while it's deleting", () => {
    const additional: AvailabilityException = {
      id: "exc-2",
      exceptionDate: "2026-04-01",
      kind: "ADDITIONAL",
      startLocal: "14:00",
      windowMin: 30,
      reason: null,
    };
    setHooks({ exceptions: { data: [additional] } });
    mockUseDeleteAvailabilityException.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: true,
      variables: "exc-2",
    });
    render(<GuideAvailabilityPage />);

    const exceptionsList = screen.getByRole("list", { name: /^date-specific hours$/i });
    expect(within(exceptionsList).getByText("Extra availability")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove date-specific hours/i })).toBeDisabled();
  });

  it("shows an empty state when there are no date-specific hours", () => {
    setHooks({ exceptions: { data: [] } });
    render(<GuideAvailabilityPage />);
    expect(screen.getByText(/no date-specific hours yet/i)).toBeInTheDocument();
  });
});

describe("GuideAvailabilityPage — booking settings panel", () => {
  it("renders the booking settings fields from useAvailabilitySettings", () => {
    render(<GuideAvailabilityPage />);

    expect(screen.getByText("America/Chicago")).toBeInTheDocument();
    expect(screen.getByText("AUTO")).toBeInTheDocument();
    expect(screen.getByText("30 days ahead")).toBeInTheDocument();
  });

  it("omits the booking settings panel while settings data is unavailable (e.g. not-yet-fetched)", () => {
    // isLoading/isError both false but data is still undefined — a defensive edge the panel
    // guards against (unlike the other panels, which default to an empty array).
    setHooks({ settings: { data: undefined, isLoading: false, isError: false } });
    render(<GuideAvailabilityPage />);

    expect(screen.queryByText("Booking rules")).not.toBeInTheDocument();
  });

  it("renders 'None'/'None set' for zeroed-out minute fields and an empty durations-offered list", () => {
    setHooks({
      settings: {
        data: {
          ...sampleSettings,
          responseDeadlineMin: 0,
          minNoticeMin: 0,
          bufferBeforeMin: 0,
          bufferAfterMin: 0,
          durationsOffered: [],
        },
      },
    });
    render(<GuideAvailabilityPage />);

    expect(screen.getAllByText("None").length).toBeGreaterThan(0);
    expect(screen.getByText("None set")).toBeInTheDocument();
  });
});

describe("GuideAvailabilityPage — resolved preview edge cases", () => {
  it("shows a no-availability message when there are no resolved occurrences", () => {
    setHooks({ resolved: { data: { ...mergedResolved, occurrences: [] } } });
    render(<GuideAvailabilityPage />);

    const preview = screen.getByRole("region", { name: /actual availability/i });
    expect(within(preview).getByText(/no resolved availability yet/i)).toBeInTheDocument();
  });

  it("joins multiple DST gap-days in a single notice", () => {
    setHooks({
      resolved: { data: { ...mergedResolved, dstGapDays: ["2026-03-08", "2026-11-01"] } },
    });
    render(<GuideAvailabilityPage />);

    const notice = screen.getByText(/daylight-saving/i);
    expect(notice).toHaveTextContent("2026-03-08");
    expect(notice).toHaveTextContent("2026-11-01");
  });
});
