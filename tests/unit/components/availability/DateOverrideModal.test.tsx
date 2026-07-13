import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { DateOverrideModal } from "@/components/availability/DateOverrideModal";
import {
  ApiError,
  useAvailabilityExceptions,
  useAvailabilitySettings,
  useOverrideMultiPreview,
  useReplaceOverrides,
  useResolvedAvailability,
} from "@/lib/data-access";
import type {
  AvailabilityException,
  AvailabilitySettings,
  OverridePreviewResponse,
  ResolvedAvailability,
} from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useAvailabilityExceptions: jest.fn(),
  useAvailabilitySettings: jest.fn(),
  useResolvedAvailability: jest.fn(),
  useOverrideMultiPreview: jest.fn(),
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

const mockUseAvailabilityExceptions = useAvailabilityExceptions as jest.Mock;
const mockUseAvailabilitySettings = useAvailabilitySettings as jest.Mock;
const mockUseResolvedAvailability = useResolvedAvailability as jest.Mock;
const mockUseOverrideMultiPreview = useOverrideMultiPreview as jest.Mock;
const mockUseReplaceOverrides = useReplaceOverrides as jest.Mock;

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

function resolved(occurrences: ResolvedAvailability["occurrences"]): ResolvedAvailability {
  return { rules: [], occurrences, dstGapDays: [], bookable: true, hasWeeklyHours: true };
}

/** Build an exception on the target date 2026-07-20. */
function exc(
  id: string,
  kind: AvailabilityException["kind"],
  startLocal: string,
  windowMin: number,
): AvailabilityException {
  return { id, exceptionDate: "2026-07-20", kind, startLocal, windowMin, reason: null };
}

let replaceMutate: jest.Mock;

function setExceptions(list: AvailabilityException[]) {
  mockUseAvailabilityExceptions.mockReturnValue({ data: list, isLoading: false });
}

beforeEach(() => {
  jest.clearAllMocks();
  setExceptions([]);
  mockUseAvailabilitySettings.mockReturnValue({ data: sampleSettings, isLoading: false });
  mockUseResolvedAvailability.mockReturnValue({
    data: resolved([
      // Existing (before) window on the target date: 9:00-11:00 AM America/Chicago.
      { startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T16:00:00Z" },
    ]),
    isLoading: false,
  });
  mockUseOverrideMultiPreview.mockReturnValue({
    data: undefined,
    isLoading: false,
    isFetching: false,
  });
  replaceMutate = jest.fn().mockResolvedValue(undefined);
  mockUseReplaceOverrides.mockReturnValue({
    mutateAsync: replaceMutate,
    isPending: false,
  });
});

/** A combined dry-run where a block trims the existing 10:00–11:00 weekly tail: the resulting
 *  window shrinks to 9:00–9:30 and 10:00–11:00 is trimmed. */
const blockingPreview: OverridePreviewResponse = {
  valid: true,
  message: null,
  days: [
    {
      date: "2026-07-20",
      resultingWindows: [{ startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T14:30:00Z" }],
      trimmed: [{ kind: "UNAVAILABLE", startLocal: "10:00", windowMin: 60 }],
      inert: false,
    },
  ],
};

function renderModal(onClose = jest.fn()) {
  render(<DateOverrideModal open initialDate="2026-07-20" onClose={onClose} />);
  return { onClose };
}

/** Type into a TimePicker hour/minute segment (jsdom can't scroll the wheel). Clicking the segment
 *  first also lands the caret inside it. */
async function typeSegment(user: UserEvent, scope: HTMLElement, name: string, text: string) {
  const el = within(scope).getByRole("textbox", { name });
  await user.click(el);
  await user.clear(el);
  await user.type(el, text);
}

/** Set a TimePicker's AM/PM segment via its key handler. */
async function setPeriod(user: UserEvent, scope: HTMLElement, name: string, ampm: "AM" | "PM") {
  const el = within(scope).getByRole("textbox", { name });
  await user.click(el);
  await user.keyboard(ampm === "PM" ? "p" : "a");
}

describe("DateOverrideModal — open guard", () => {
  it("renders nothing when opened without a concrete date (no silent today fallback)", () => {
    render(<DateOverrideModal open initialDate={null} onClose={jest.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("still renders the editor for a concrete initialDate", () => {
    render(<DateOverrideModal open initialDate="2026-07-20" onClose={jest.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("DateOverrideModal — kind default + loading existing overrides", () => {
  it("defaults the toggle to 'Block time off' when the day has UNAVAILABLE exceptions, prefilled from them", () => {
    setExceptions([exc("e1", "UNAVAILABLE", "13:00", 60)]);
    renderModal();
    const dialog = screen.getByRole("dialog");
    const group = within(dialog).getByRole("group", { name: "Override type" });
    expect(within(group).getByRole("button", { name: "Block time off" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // One prefilled slot from the existing exception: 1:00 PM – 2:00 PM.
    const slot = within(dialog).getByRole("group", { name: "Time slot 1" });
    expect(within(slot).getByRole("textbox", { name: "Time slot 1 from hour" })).toHaveValue("1");
    expect(within(slot).getByRole("textbox", { name: "Time slot 1 from AM/PM" })).toHaveValue("PM");
    expect(within(slot).getByRole("textbox", { name: "Time slot 1 to hour" })).toHaveValue("2");
  });

  it("defaults to 'Add extra' when the day has only ADDITIONAL exceptions", () => {
    setExceptions([exc("e1", "ADDITIONAL", "15:00", 60)]);
    renderModal();
    const dialog = screen.getByRole("dialog");
    const group = within(dialog).getByRole("group", { name: "Override type" });
    expect(within(group).getByRole("button", { name: "Add extra time" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(dialog).getAllByRole("group", { name: /^Time slot \d+$/ })).toHaveLength(1);
  });

  it("defaults to 'Block time off' on an empty day, with ZERO slots (no pre-filled row)", () => {
    setExceptions([]);
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Block time off" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(dialog).queryAllByRole("group", { name: /^Time slot \d+$/ })).toHaveLength(0);
    expect(within(dialog).getByRole("button", { name: /add time slot/i })).toBeInTheDocument();
  });

  it("switching the toggle re-loads the OTHER kind's existing slots", async () => {
    const user = userEvent.setup();
    // Day has one UNAVAILABLE (1 PM) and one ADDITIONAL (3 PM).
    setExceptions([exc("u1", "UNAVAILABLE", "13:00", 60), exc("a1", "ADDITIONAL", "15:00", 30)]);
    renderModal();
    const dialog = screen.getByRole("dialog");

    // Opens on UNAVAILABLE (1 PM slot).
    let slot = within(dialog).getByRole("group", { name: "Time slot 1" });
    expect(within(slot).getByRole("textbox", { name: "Time slot 1 from hour" })).toHaveValue("1");

    // Switch to Add extra → the 3 PM ADDITIONAL slot loads.
    await user.click(within(dialog).getByRole("button", { name: "Add extra time" }));
    slot = within(dialog).getByRole("group", { name: "Time slot 1" });
    expect(within(slot).getByRole("textbox", { name: "Time slot 1 from hour" })).toHaveValue("3");
    expect(within(slot).getByRole("textbox", { name: "Time slot 1 from AM/PM" })).toHaveValue("PM");
  });
});

describe("DateOverrideModal — the info alert + title", () => {
  it("shows the persistent single-day-override note pointing at Weekly hours", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/single-day override/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/does not change your weekly hours/i)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/for recurring changes, use weekly hours/i),
    ).toBeInTheDocument();
  });

  it("renders the weekday + M/D title and the eyebrow (2026-07-20 is a Monday)", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Date-specific override")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("heading", { name: /Date-specific hours · Mon 7\/20/ }),
    ).toBeInTheDocument();
  });

  it("has no date-range pickers (single-day editor)", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByLabelText("From date")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("To date")).not.toBeInTheDocument();
  });
});

describe("DateOverrideModal — add / remove / clear slots", () => {
  it("'+ Add time slot' adds a row; the row default is 9:00 AM–10:00 AM", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).queryAllByRole("group", { name: /^Time slot \d+$/ })).toHaveLength(0);
    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));
    expect(within(dialog).getAllByRole("group", { name: /^Time slot \d+$/ })).toHaveLength(1);

    const slot = within(dialog).getByRole("group", { name: "Time slot 1" });
    expect(within(slot).getByRole("textbox", { name: "Time slot 1 from hour" })).toHaveValue("9");
    expect(within(slot).getByRole("textbox", { name: "Time slot 1 to hour" })).toHaveValue("10");
  });

  it("per-row trash removes that row", async () => {
    const user = userEvent.setup();
    setExceptions([exc("u1", "UNAVAILABLE", "13:00", 60)]);
    renderModal();
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getAllByRole("group", { name: /^Time slot \d+$/ })).toHaveLength(1);
    await user.click(within(dialog).getByRole("button", { name: "Remove time slot 1" }));
    expect(within(dialog).queryAllByRole("group", { name: /^Time slot \d+$/ })).toHaveLength(0);
  });

  it("'Clear all time slots' empties all slots at once", async () => {
    const user = userEvent.setup();
    setExceptions([exc("u1", "UNAVAILABLE", "13:00", 60), exc("u2", "UNAVAILABLE", "16:00", 60)]);
    renderModal();
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getAllByRole("group", { name: /^Time slot \d+$/ })).toHaveLength(2);
    await user.click(within(dialog).getByRole("button", { name: /clear all time slots/i }));
    expect(within(dialog).queryAllByRole("group", { name: /^Time slot \d+$/ })).toHaveLength(0);
  });
});

describe("DateOverrideModal — replaceExisting dry-run preview", () => {
  it("calls useOverrideMultiPreview with replaceExisting:true and the current windows", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));
    // Slot default 9:00–10:00; move end to 11:00.
    await typeSegment(user, dialog, "Time slot 1 to hour", "11");

    await waitFor(() =>
      expect(mockUseOverrideMultiPreview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          dateFrom: "2026-07-20",
          dateTo: "2026-07-20",
          kind: "UNAVAILABLE",
          replaceExisting: true,
          windows: [{ startLocal: "09:00", windowMin: 120 }],
        }),
      ),
    );
  });

  it("previews with EMPTY windows (replaceExisting:true) when the day is cleared", async () => {
    const user = userEvent.setup();
    setExceptions([exc("u1", "UNAVAILABLE", "13:00", 60)]);
    renderModal();
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /clear all time slots/i }));

    await waitFor(() =>
      expect(mockUseOverrideMultiPreview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          dateFrom: "2026-07-20",
          dateTo: "2026-07-20",
          kind: "UNAVAILABLE",
          replaceExisting: true,
          windows: [],
        }),
      ),
    );
  });

  it("renders the combined Now/After chart with hatched Time-off from the PROPOSED block windows + one legend", async () => {
    const user = userEvent.setup();
    mockUseOverrideMultiPreview.mockReturnValue({
      data: blockingPreview,
      isLoading: false,
      isFetching: false,
    });
    renderModal();
    const dialog = screen.getByRole("dialog");

    // Add a slot 10:00–10:30 so its proposed window differs from the mocked `trimmed` (10:00–11:00).
    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));
    await typeSegment(user, dialog, "Time slot 1 from hour", "10");
    await typeSegment(user, dialog, "Time slot 1 to minutes", "30");

    const nowBar = await within(dialog).findByRole("group", {
      name: "Current hours on 2026-07-20 (AM)",
    });
    expect(within(nowBar).getByTitle(/Available · 9:00 AM – 11:00 AM/)).toBeInTheDocument();

    const afterBar = within(dialog).getByRole("group", {
      name: "After applying on 2026-07-20 (AM)",
    });
    expect(within(afterBar).getByTitle(/Available · 9:00 AM – 9:30 AM/)).toBeInTheDocument();
    const off = await within(afterBar).findByTitle(/Time off · 10:00 AM – 10:30 AM/);
    expect(off).toHaveClass("calendar-hatch");
    expect(within(afterBar).queryByTitle(/Time off · 10:00 AM – 11:00 AM/)).not.toBeInTheDocument();

    expect(within(dialog).getByText("Available")).toBeInTheDocument();
    expect(within(dialog).getByText("Time off")).toBeInTheDocument();
    expect(within(dialog).getByText("Extra")).toBeInTheDocument();
  });

  it("renders a midnight-ending window fully in the PM half with no post-midnight sliver (same-day model)", async () => {
    // The same-day model (option A, `toWindowMin`) caps every window at start+windowMin <= 1440, so a
    // window can never cross midnight into the next axis day. 10:00 PM – 12:00 AM (22:00 + 120min) is
    // the latest a window can run: it ends exactly at 1440 and draws entirely inside the PM half, with
    // nothing spilling into the AM half. This is why the "post-midnight sliver" is out of scope — it is
    // unreachable in this render path, not merely clamped away.
    setExceptions([exc("a1", "ADDITIONAL", "22:00", 120)]);
    mockUseOverrideMultiPreview.mockReturnValue({
      data: {
        valid: true,
        message: null,
        days: [{ date: "2026-07-20", resultingWindows: [], trimmed: [], inert: false }],
      },
      isLoading: false,
      isFetching: false,
    });
    renderModal();
    const dialog = screen.getByRole("dialog");

    const afterPm = await within(dialog).findByRole("group", {
      name: "After applying on 2026-07-20 (PM)",
    });
    expect(within(afterPm).getByTitle(/Extra · 10:00 PM – 12:00 AM/)).toBeInTheDocument();

    const afterAm = within(dialog).getByRole("group", {
      name: "After applying on 2026-07-20 (AM)",
    });
    expect(within(afterAm).queryByTitle(/Extra · 10:00 PM – 12:00 AM/)).not.toBeInTheDocument();
  });

  it("splits each date into a fixed 12-hour AM axis and PM axis (Now × 2, After × 2)", async () => {
    mockUseOverrideMultiPreview.mockReturnValue({
      data: blockingPreview,
      isLoading: false,
      isFetching: false,
    });
    renderModal();
    const dialog = screen.getByRole("dialog");
    const region = within(dialog).getByRole("region", { name: "Preview" });

    await within(region).findByRole("group", { name: "Current hours on 2026-07-20 (AM)" });
    expect(
      within(region).getByRole("group", { name: "Current hours on 2026-07-20 (PM)" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("group", { name: "After applying on 2026-07-20 (AM)" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("group", { name: "After applying on 2026-07-20 (PM)" }),
    ).toBeInTheDocument();

    expect(within(region).getAllByText("12 AM")).toHaveLength(2);
    expect(within(region).getAllByText("12 PM")).toHaveLength(2);
  });

  it("the 'After applying' heading is bold", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    const heading = within(dialog).getByText("After applying");
    expect(heading).toHaveClass("font-bold");
  });

  it("renders an out-of-horizon (inert) date as an 'activates later' notice, not empty Now/After bars", async () => {
    // A far-future date (reachable now that the calendar's year picker navigates freely): Core can't
    // materialize occurrences yet, so it returns empty windows flagged inert. Without this branch the
    // day would render as empty Now/After bars, indistinguishable from a genuinely-empty day.
    mockUseOverrideMultiPreview.mockReturnValue({
      data: {
        valid: true,
        message: null,
        days: [{ date: "2026-07-20", resultingWindows: [], trimmed: [], inert: true }],
      },
      isLoading: false,
      isFetching: false,
    });
    renderModal();
    const dialog = screen.getByRole("dialog");
    const region = within(dialog).getByRole("region", { name: "Preview" });

    // The notice explains WHY there is no timeline.
    await within(region).findByText(/Beyond your booking horizon/i);

    // The Now/After AM/PM bars are suppressed for an inert date.
    expect(
      within(region).queryByRole("group", { name: "After applying on 2026-07-20 (AM)" }),
    ).not.toBeInTheDocument();
    expect(
      within(region).queryByRole("group", { name: "Current hours on 2026-07-20 (AM)" }),
    ).not.toBeInTheDocument();
  });
});

describe("DateOverrideModal — conflict warning (block-only, from the combined dry-run)", () => {
  it("shows the amber block-framed before→after message when the net block trims (UNAVAILABLE)", async () => {
    mockUseOverrideMultiPreview.mockReturnValue({
      data: blockingPreview,
      isLoading: false,
      isFetching: false,
    });
    setExceptions([exc("u1", "UNAVAILABLE", "10:00", 60)]);
    renderModal();
    const dialog = screen.getByRole("dialog");

    const warning = await within(dialog).findByText(/This blocks time on Mon 7\/20/);
    expect(warning).toBeInTheDocument();
    expect(
      within(dialog).getByText(/that overlaps your current hours — 9:00 AM – 11:00 AM becomes/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Confirm the change\?/)).toBeInTheDocument();
  });

  it("shows NO conflict warning for 'Add extra' (ADDITIONAL)", async () => {
    const user = userEvent.setup();
    const extraPreview: OverridePreviewResponse = {
      valid: true,
      message: null,
      days: [
        {
          date: "2026-07-20",
          resultingWindows: [
            { startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T16:00:00Z" },
            { startAt: "2026-07-20T18:00:00Z", endAt: "2026-07-20T19:00:00Z" },
          ],
          trimmed: [],
          inert: false,
        },
      ],
    };
    mockUseOverrideMultiPreview.mockReturnValue({
      data: extraPreview,
      isLoading: false,
      isFetching: false,
    });
    renderModal();
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Add extra time" }));
    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));

    await within(dialog).findByRole("group", { name: "After applying on 2026-07-20 (AM)" });
    expect(await within(dialog).findByTitle(/Extra · 9:00 AM – 10:00 AM/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/This blocks time on/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Confirm the change\?/)).not.toBeInTheDocument();
  });
});

describe("DateOverrideModal — conflict warning fires only when availability SHRINKS (S7)", () => {
  /** Set a combined dry-run whose only day's resulting windows are `resultingWindows`. */
  function setPreview(resultingWindows: { startAt: string; endAt: string }[]) {
    mockUseOverrideMultiPreview.mockReturnValue({
      data: {
        valid: true,
        message: null,
        days: [{ date: "2026-07-20", resultingWindows, trimmed: [], inert: false }],
      },
      isLoading: false,
      isFetching: false,
    });
  }

  it("does NOT warn when a removal only INCREASES availability (before ⊆ after)", async () => {
    // UNAVAILABLE override, but the resulting hours GROW: before is a small 9:00–9:30 window and
    // after is 9:00–11:00 (a previously-set block was removed). Nothing was taken away → no
    // block-framed warning even though before ≠ after.
    mockUseResolvedAvailability.mockReturnValue({
      data: resolved([{ startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T14:30:00Z" }]),
      isLoading: false,
    });
    setPreview([{ startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T16:00:00Z" }]);
    setExceptions([exc("u1", "UNAVAILABLE", "10:00", 60)]);
    renderModal();
    const dialog = screen.getByRole("dialog");

    await within(dialog).findByRole("group", { name: "After applying on 2026-07-20 (AM)" });
    expect(within(dialog).queryByText(/This blocks time on/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Confirm the change\?/)).not.toBeInTheDocument();
  });

  it("WARNS when a block TAKES availability away (before ⊄ after)", async () => {
    // before 9:00–11:00, after shrinks to 9:00–9:30 → a minute available before is gone → warn.
    mockUseResolvedAvailability.mockReturnValue({
      data: resolved([{ startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T16:00:00Z" }]),
      isLoading: false,
    });
    setPreview([{ startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T14:30:00Z" }]);
    setExceptions([exc("u1", "UNAVAILABLE", "10:00", 60)]);
    renderModal();
    const dialog = screen.getByRole("dialog");

    expect(await within(dialog).findByText(/This blocks time on Mon 7\/20/)).toBeInTheDocument();
  });

  it("WARNS on a same-size block swap (equal total minutes, different windows)", async () => {
    // before = 3:00–4:00 PM (60 min available); after = 9:00–10:00 AM (also 60 min). Total minutes
    // are UNCHANGED, but 3:00–4:00 PM was available before and is not after → !(before ⊆ after) →
    // must still warn. A strict-subset / minute-count fix would miss this.
    mockUseResolvedAvailability.mockReturnValue({
      data: resolved([{ startAt: "2026-07-20T20:00:00Z", endAt: "2026-07-20T21:00:00Z" }]),
      isLoading: false,
    });
    setPreview([{ startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T15:00:00Z" }]);
    setExceptions([exc("u1", "UNAVAILABLE", "15:00", 60)]);
    renderModal();
    const dialog = screen.getByRole("dialog");

    expect(await within(dialog).findByText(/This blocks time on Mon 7\/20/)).toBeInTheDocument();
  });
});

describe("DateOverrideModal — Confirm saves the day as ONE atomic replace", () => {
  it("saves the day as ONE atomic replace call, not delete-then-create", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    setExceptions([exc("u1", "UNAVAILABLE", "13:00", 60), exc("a1", "ADDITIONAL", "15:00", 30)]);
    renderModal(onClose);
    const dialog = screen.getByRole("dialog");

    // Opens on UNAVAILABLE with the 1 PM slot. Add a second slot (default 9–10 AM).
    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));
    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    // ONE atomic replace with the full desired set for this kind — no per-id delete, no per-slot create.
    await waitFor(() => expect(replaceMutate).toHaveBeenCalledTimes(1));
    expect(replaceMutate).toHaveBeenCalledWith({
      date: "2026-07-20",
      kind: "UNAVAILABLE",
      windows: [
        { startLocal: "13:00", windowMin: 60 },
        { startLocal: "09:00", windowMin: 60 },
      ],
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("Confirm submits the newly selected kind after switching the toggle", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Add extra time" }));
    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));
    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    await waitFor(() => expect(replaceMutate).toHaveBeenCalledTimes(1));
    expect(replaceMutate).toHaveBeenCalledWith(expect.objectContaining({ kind: "ADDITIONAL" }));
  });

  it("submits the '24:00' end-of-day sentinel (10 PM → 12 AM = 120 min)", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));
    await typeSegment(user, dialog, "Time slot 1 from hour", "10");
    await setPeriod(user, dialog, "Time slot 1 from AM/PM", "PM");
    await typeSegment(user, dialog, "Time slot 1 to hour", "12");
    await setPeriod(user, dialog, "Time slot 1 to AM/PM", "AM");

    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    await waitFor(() => expect(replaceMutate).toHaveBeenCalledTimes(1));
    expect(replaceMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        windows: [{ startLocal: "22:00", windowMin: 120 }],
      }),
    );
  });
});

describe("DateOverrideModal — zero slots is a valid 'clear' request", () => {
  it("Confirm is ENABLED with zero slots", () => {
    setExceptions([]);
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryAllByRole("group", { name: /^Time slot \d+$/ })).toHaveLength(0);
    expect(within(dialog).getByRole("button", { name: "Confirm change" })).toBeEnabled();
  });

  it("Confirm with zero slots replaces the day's [kind] with EMPTY windows (clear)", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    setExceptions([exc("u1", "UNAVAILABLE", "13:00", 60), exc("u2", "UNAVAILABLE", "16:00", 60)]);
    renderModal(onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /clear all time slots/i }));
    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    await waitFor(() => expect(replaceMutate).toHaveBeenCalledTimes(1));
    expect(replaceMutate).toHaveBeenCalledWith({
      date: "2026-07-20",
      kind: "UNAVAILABLE",
      windows: [],
    });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("DateOverrideModal — structural validation", () => {
  it("a slot whose start is not before its end shows an inline error and disables Confirm", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));
    // Default slot 9:00–10:00; move From to 10:00 so start === end (toWindowMin rejects).
    await typeSegment(user, dialog, "Time slot 1 from hour", "10");

    expect(
      await within(dialog).findByText(/start time must be before the end time/i),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Confirm change" })).toBeDisabled();
  });

  it("an EMPTY slot list does NOT disable Confirm", () => {
    setExceptions([]);
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Confirm change" })).toBeEnabled();
  });
});

describe("DateOverrideModal — preview error surfaced in the preview region (B3)", () => {
  it("shows the preview error reason instead of a blank chart", async () => {
    mockUseOverrideMultiPreview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: new ApiError(422, "Windows cross midnight"),
    });
    renderModal();
    const dialog = screen.getByRole("dialog");
    const region = within(dialog).getByRole("region", { name: "Preview" });

    expect(await within(region).findByText(/cross midnight/i)).toBeInTheDocument();
    expect(within(region).queryByText(/no affected dates yet/i)).not.toBeInTheDocument();
  });

  it("falls back to a generic notice when the preview error has no message", async () => {
    mockUseOverrideMultiPreview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: new ApiError(500, ""),
    });
    renderModal();
    const dialog = screen.getByRole("dialog");
    const region = within(dialog).getByRole("region", { name: "Preview" });

    expect(await within(region).findByText(/couldn.t preview this change/i)).toBeInTheDocument();
  });
});

describe("DateOverrideModal — a replace 422 keeps the modal open", () => {
  it("a replace 422 keeps the modal open and surfaces the message (no partial local wipe)", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    setExceptions([exc("u1", "UNAVAILABLE", "13:00", 60)]);
    replaceMutate.mockRejectedValue(
      new ApiError(422, "This time is outside the guide's availability"),
    );
    renderModal(onClose);
    const dialog = screen.getByRole("dialog");

    // Seeded with the 1 PM slot; Confirm rejects.
    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    expect(
      await within(dialog).findByText(/outside the guide's availability/i),
    ).toBeInTheDocument();
    // Dialog stays open and the edited slot is NOT wiped.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(dialog).getByRole("group", { name: "Time slot 1" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
