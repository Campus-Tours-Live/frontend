import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeeklyHoursPanel } from "@/components/availability/WeeklyHoursPanel";
import {
  ApiError,
  useAvailabilityRules,
  useAvailabilitySettings,
  useCreateAvailabilityRule,
  useDeleteAvailabilityRule,
  useReplaceOverrides,
  useReplaceRules,
  useUpdateAvailabilityRule,
} from "@/lib/data-access";
import type { AvailabilityRule, AvailabilitySettings } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useAvailabilityRules: jest.fn(),
  useAvailabilitySettings: jest.fn(),
  useCreateAvailabilityRule: jest.fn(),
  useUpdateAvailabilityRule: jest.fn(),
  useDeleteAvailabilityRule: jest.fn(),
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
const mockUseAvailabilitySettings = useAvailabilitySettings as jest.Mock;
const mockUseCreateAvailabilityRule = useCreateAvailabilityRule as jest.Mock;
const mockUseUpdateAvailabilityRule = useUpdateAvailabilityRule as jest.Mock;
const mockUseDeleteAvailabilityRule = useDeleteAvailabilityRule as jest.Mock;
const mockUseReplaceRules = useReplaceRules as jest.Mock;
const mockUseReplaceOverrides = useReplaceOverrides as jest.Mock;

// Monday: two active ranges (9-11am, 1-2pm). Tuesday: one INACTIVE rule (day toggled off).
const mondayRuleA: AvailabilityRule = {
  id: "rule-mon-1",
  dayOfWeek: 1,
  startLocal: "09:00",
  windowMin: 120,
  timezone: "America/Chicago",
  effectiveFrom: null,
  effectiveTo: null,
  active: true,
};
const mondayRuleB: AvailabilityRule = {
  id: "rule-mon-2",
  dayOfWeek: 1,
  startLocal: "13:00",
  windowMin: 60,
  timezone: "America/Chicago",
  effectiveFrom: null,
  effectiveTo: null,
  active: true,
};
const tuesdayInactiveRule: AvailabilityRule = {
  id: "rule-tue-1",
  dayOfWeek: 2,
  startLocal: "14:00",
  windowMin: 30,
  timezone: "America/Chicago",
  effectiveFrom: null,
  effectiveTo: null,
  active: false,
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

function setRules(rules: AvailabilityRule[]) {
  mockUseAvailabilityRules.mockReturnValue({ data: rules, isLoading: false, isError: false });
}

function mondayRow() {
  const list = screen.getByRole("list", { name: /weekly hours by day/i });
  return within(list).getByText("Monday").closest('[role="listitem"]') as HTMLElement;
}

function tuesdayRow() {
  const list = screen.getByRole("list", { name: /weekly hours by day/i });
  return within(list).getByText("Tuesday").closest('[role="listitem"]') as HTMLElement;
}

beforeEach(() => {
  jest.clearAllMocks();
  setRules([mondayRuleA, mondayRuleB, tuesdayInactiveRule]);
  mockUseAvailabilitySettings.mockReturnValue({
    data: sampleSettings,
    isLoading: false,
    isError: false,
  });
  mockUseCreateAvailabilityRule.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseUpdateAvailabilityRule.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseDeleteAvailabilityRule.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseReplaceRules.mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
  });
  mockUseReplaceOverrides.mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
  });
});

describe("WeeklyHoursPanel — display (from–to, no per-pill edit/delete)", () => {
  it("renders a day with two rules as two from–to lines + a single Edit button", () => {
    render(<WeeklyHoursPanel />);

    const row = mondayRow();
    expect(within(row).getByText("9:00 AM – 11:00 AM")).toBeInTheDocument();
    expect(within(row).getByText("1:00 PM – 2:00 PM")).toBeInTheDocument();
    expect(within(row).getAllByRole("button", { name: /^Edit Monday hours$/i })).toHaveLength(1);
    // No per-pill edit/delete controls.
    expect(within(row).queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("shows a day with only inactive rules as Unavailable (no from–to lines)", () => {
    const row = tuesdayRow.bind(null);
    render(<WeeklyHoursPanel />);
    expect(within(row()).getByRole("switch", { name: /tuesday availability/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(within(row()).queryByText(/AM –|PM –/)).not.toBeInTheDocument();
  });

  it("marks a day with active rules as Available via the switch's aria-checked", () => {
    render(<WeeklyHoursPanel />);
    expect(
      within(mondayRow()).getByRole("switch", { name: /monday availability/i }),
    ).toHaveAttribute("aria-checked", "true");
  });
});

describe("WeeklyHoursPanel — toggle drives rule `active` (deactivate-preserve)", () => {
  it("toggling an Available day to Unavailable calls update with active:false for every active rule", async () => {
    const user = userEvent.setup();
    const updateMutate = jest.fn().mockResolvedValue(undefined);
    mockUseUpdateAvailabilityRule.mockReturnValue({ mutateAsync: updateMutate, isPending: false });
    render(<WeeklyHoursPanel />);

    await user.click(within(mondayRow()).getByRole("switch", { name: /monday availability/i }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(2));
    expect(updateMutate).toHaveBeenCalledWith({ id: "rule-mon-1", body: { active: false } });
    expect(updateMutate).toHaveBeenCalledWith({ id: "rule-mon-2", body: { active: false } });
  });

  it("toggling an Unavailable day (with existing inactive rules) to Available re-activates them", async () => {
    const user = userEvent.setup();
    const updateMutate = jest.fn().mockResolvedValue(undefined);
    mockUseUpdateAvailabilityRule.mockReturnValue({ mutateAsync: updateMutate, isPending: false });
    render(<WeeklyHoursPanel />);

    await user.click(within(tuesdayRow()).getByRole("switch", { name: /tuesday availability/i }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate).toHaveBeenCalledWith({ id: "rule-tue-1", body: { active: true } });
  });

  it("opens DayHoursModal (not an update call) when toggling Available on a day with zero rules", async () => {
    const user = userEvent.setup();
    const updateMutate = jest.fn();
    mockUseUpdateAvailabilityRule.mockReturnValue({ mutateAsync: updateMutate, isPending: false });
    render(<WeeklyHoursPanel />);

    const list = screen.getByRole("list", { name: /weekly hours by day/i });
    const sundayRow = within(list).getByText("Sunday").closest('[role="listitem"]') as HTMLElement;
    await user.click(within(sundayRow).getByRole("switch", { name: /sunday availability/i }));

    expect(updateMutate).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /edit sunday hours/i })).toBeInTheDocument();
  });
});

describe("WeeklyHoursPanel — Edit opens DayHoursModal prefilled with from–to", () => {
  it("prefills the modal's from/to pickers with the day's existing ranges", async () => {
    const user = userEvent.setup();
    render(<WeeklyHoursPanel />);

    await user.click(within(mondayRow()).getByRole("button", { name: /^Edit Monday hours$/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /edit monday hours/i })).toBeInTheDocument();

    const range1 = within(dialog).getByRole("group", { name: "Range 1" });
    expect(within(range1).getByRole("textbox", { name: "Range 1 from hour" })).toHaveValue("9");
    expect(within(range1).getByRole("textbox", { name: "Range 1 from AM/PM" })).toHaveValue("AM");
    expect(within(range1).getByRole("textbox", { name: "Range 1 to hour" })).toHaveValue("11");
    expect(within(range1).getByRole("textbox", { name: "Range 1 to AM/PM" })).toHaveValue("AM");

    const range2 = within(dialog).getByRole("group", { name: "Range 2" });
    expect(within(range2).getByRole("textbox", { name: "Range 2 from hour" })).toHaveValue("1");
    expect(within(range2).getByRole("textbox", { name: "Range 2 from AM/PM" })).toHaveValue("PM");
    expect(within(range2).getByRole("textbox", { name: "Range 2 to hour" })).toHaveValue("2");
    expect(within(range2).getByRole("textbox", { name: "Range 2 to AM/PM" })).toHaveValue("PM");
  });
});

describe("WeeklyHoursPanel — re-activate 422 leaves the day Unavailable + notifies", () => {
  it("shows the backend message and does not flip the day when re-activation is rejected", async () => {
    const user = userEvent.setup();
    const updateMutate = jest
      .fn()
      .mockRejectedValue(new ApiError(422, "This time overlaps another active rule."));
    mockUseUpdateAvailabilityRule.mockReturnValue({ mutateAsync: updateMutate, isPending: false });
    render(<WeeklyHoursPanel />);

    const toggle = within(tuesdayRow()).getByRole("switch", { name: /tuesday availability/i });
    await user.click(toggle);

    expect(await screen.findByText(/this time overlaps another active rule/i)).toBeInTheDocument();

    // The day is left Unavailable — no silent partial success.
    expect(
      within(tuesdayRow()).getByRole("switch", { name: /tuesday availability/i }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("falls back to a generic message when the rejection isn't a 422 ApiError", async () => {
    const user = userEvent.setup();
    const updateMutate = jest.fn().mockRejectedValue(new Error("network down"));
    mockUseUpdateAvailabilityRule.mockReturnValue({ mutateAsync: updateMutate, isPending: false });
    render(<WeeklyHoursPanel />);

    await user.click(within(tuesdayRow()).getByRole("switch", { name: /tuesday availability/i }));

    expect(
      await screen.findByText(/could not update this day's availability/i),
    ).toBeInTheDocument();
  });
});
