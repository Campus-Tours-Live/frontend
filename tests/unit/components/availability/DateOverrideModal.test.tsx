import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { DateOverrideModal } from "@/components/availability/DateOverrideModal";
import {
  ApiError,
  useAvailabilitySettings,
  useCreateAvailabilityException,
  useOverrideMultiPreview,
  useResolvedAvailability,
} from "@/lib/data-access";
import type {
  AvailabilitySettings,
  OverridePreviewResponse,
  ResolvedAvailability,
} from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useAvailabilitySettings: jest.fn(),
  useResolvedAvailability: jest.fn(),
  useOverrideMultiPreview: jest.fn(),
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

const mockUseAvailabilitySettings = useAvailabilitySettings as jest.Mock;
const mockUseResolvedAvailability = useResolvedAvailability as jest.Mock;
const mockUseOverrideMultiPreview = useOverrideMultiPreview as jest.Mock;
const mockUseCreateAvailabilityException = useCreateAvailabilityException as jest.Mock;

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
  return { rules: [], occurrences, dstGapDays: [] };
}

let createMutate: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
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
  createMutate = jest.fn().mockResolvedValue(undefined);
  mockUseCreateAvailabilityException.mockReturnValue({
    mutateAsync: createMutate,
    isPending: false,
  });
});

/** A combined dry-run where a block trims the existing 10:00–11:00 weekly tail: the resulting
 *  window shrinks to 9:00–9:30 and 10:00–11:00 is trimmed. (Independent of the form times — the
 *  mock returns fixed data representing the NET of all slots.) */
const blockingPreview: OverridePreviewResponse = {
  valid: true,
  message: null,
  days: [
    {
      date: "2026-07-20",
      resultingWindows: [{ startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T14:30:00Z" }],
      trimmed: [{ kind: "UNAVAILABLE", startLocal: "10:00", windowMin: 60 }],
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

describe("DateOverrideModal — segmented toggle", () => {
  it("has a two-segment control whose selected segment is aria-pressed", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    const group = within(dialog).getByRole("group", { name: "Override type" });
    // Default kind is UNAVAILABLE → "Block time off" is the filled/pressed segment.
    expect(within(group).getByRole("button", { name: "Block time off" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(group).getByRole("button", { name: "Add extra" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("switching the segment toggles kind (Confirm submits the newly selected kind)", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Add extra" }));
    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({ kind: "ADDITIONAL" }));
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
});

describe("DateOverrideModal — time slots use the shared weekly TimePicker", () => {
  it("prefills the default slot's From/To TimePicker segments (9:00 AM / 10:00 AM)", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    const slot = within(dialog).getByRole("group", { name: "Time slot 1" });
    expect(within(slot).getByRole("textbox", { name: "Time slot 1 from hour" })).toHaveValue("9");
    expect(within(slot).getByRole("textbox", { name: "Time slot 1 from AM/PM" })).toHaveValue("AM");
    expect(within(slot).getByRole("textbox", { name: "Time slot 1 to hour" })).toHaveValue("10");
  });

  it("adding a slot via '+ Add time slot' renders N rows", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getAllByRole("group", { name: /^Time slot \d+$/ })).toHaveLength(1);
    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));
    expect(within(dialog).getAllByRole("group", { name: /^Time slot \d+$/ })).toHaveLength(2);
    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));
    expect(within(dialog).getAllByRole("group", { name: /^Time slot \d+$/ })).toHaveLength(3);
  });
});

describe("DateOverrideModal — ONE combined dry-run preview (all slots' windows)", () => {
  it("calls useOverrideMultiPreview with ALL slots' windows (net-of-all, one request body)", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));
    // Slot 2 default is 9:00–10:00; move its end to 11:00 so the two windows differ.
    await typeSegment(user, dialog, "Time slot 2 to hour", "11");

    await waitFor(() =>
      expect(mockUseOverrideMultiPreview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          dateFrom: "2026-07-20",
          dateTo: "2026-07-20",
          kind: "UNAVAILABLE",
          windows: [
            { startLocal: "09:00", windowMin: 60 },
            { startLocal: "09:00", windowMin: 120 },
          ],
        }),
      ),
    );
  });

  it("renders a SINGLE combined Now/After pair per date (not per-slot) reflecting net resultingWindows + one legend", async () => {
    const user = userEvent.setup();
    mockUseOverrideMultiPreview.mockReturnValue({
      data: blockingPreview,
      isLoading: false,
      isFetching: false,
    });

    renderModal();
    const dialog = screen.getByRole("dialog");
    // Two slots, but still ONE After bar for the date (combined, never per-slot).
    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));

    // "Now" bar = the current (before) window 9:00–11:00, bucketed from resolved availability.
    const nowBar = await within(dialog).findByRole("group", {
      name: "Current hours on 2026-07-20",
    });
    expect(within(nowBar).getByTitle(/Available · 9:00 AM – 11:00 AM/)).toBeInTheDocument();

    // Exactly ONE After bar (getByRole throws if there were a per-slot pair each).
    const afterBar = within(dialog).getByRole("group", { name: "After applying on 2026-07-20" });
    expect(within(afterBar).getByTitle(/Available · 9:00 AM – 9:30 AM/)).toBeInTheDocument();
    const timeOff = within(afterBar).getByTitle(/Time off · 10:00 AM – 11:00 AM/);
    expect(timeOff).toHaveClass("calendar-hatch");

    // Legend rendered once (Available / Time off / Extra).
    expect(within(dialog).getByText("Available")).toBeInTheDocument();
    expect(within(dialog).getByText("Time off")).toBeInTheDocument();
    expect(within(dialog).getByText("Extra")).toBeInTheDocument();
  });

  it("renders each proposed slot as a blue Extra segment in Add-extra mode", async () => {
    const user = userEvent.setup();
    const extraPreview: OverridePreviewResponse = {
      valid: true,
      message: null,
      days: [
        {
          date: "2026-07-20",
          resultingWindows: [{ startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T16:00:00Z" }],
          trimmed: [],
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
    await user.click(within(dialog).getByRole("button", { name: "Add extra" }));

    await within(dialog).findByRole("group", { name: "After applying on 2026-07-20" });
    // The proposed override window (default 9:00–10:00) shows blue as "Extra" (waits for the
    // debounced dry-run to re-render in ADDITIONAL mode).
    const extra = await within(dialog).findByTitle(/Extra · 9:00 AM – 10:00 AM/);
    expect(extra).toHaveClass("bg-primary");
  });

  it("AUTO-RANGES the axis to cover a late slot even when it trims/changes nothing (bug fix)", async () => {
    const user = userEvent.setup();
    // A block on an empty 5–7 PM: the morning window is unchanged and nothing is trimmed, so the
    // late slot appears in NO segment. The axis must still extend to 7 PM (old bug: fixed ~8–11 AM
    // cut it off) — proven by a "7:00 PM" tick appearing in the preview.
    const unchangedPreview: OverridePreviewResponse = {
      valid: true,
      message: null,
      days: [
        {
          date: "2026-07-20",
          resultingWindows: [{ startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T16:00:00Z" }],
          trimmed: [],
        },
      ],
    };
    mockUseOverrideMultiPreview.mockReturnValue({
      data: unchangedPreview,
      isLoading: false,
      isFetching: false,
    });

    renderModal();
    const dialog = screen.getByRole("dialog");
    // Move the single slot to 5:00 PM – 7:00 PM.
    await typeSegment(user, dialog, "Time slot 1 from hour", "5");
    await setPeriod(user, dialog, "Time slot 1 from AM/PM", "PM");
    await typeSegment(user, dialog, "Time slot 1 to hour", "7");
    await setPeriod(user, dialog, "Time slot 1 to AM/PM", "PM");

    const region = within(dialog).getByRole("region", { name: "Preview" });
    // The axis domain reaches 7 PM — a tick past 11 AM that the old fixed axis would have dropped.
    expect(await within(region).findByText("7:00 PM")).toBeInTheDocument();
  });
});

describe("DateOverrideModal — conflict warning (block-only, from the combined dry-run)", () => {
  it("shows the amber block-framed before→after message when the net block trims (UNAVAILABLE)", async () => {
    mockUseOverrideMultiPreview.mockReturnValue({
      data: blockingPreview,
      isLoading: false,
      isFetching: false,
    });

    renderModal();
    const dialog = screen.getByRole("dialog");
    // Default mode is UNAVAILABLE (Block time off) — no need to toggle.

    const warning = await within(dialog).findByText(/This blocks time on Mon 7\/20/);
    expect(warning).toBeInTheDocument();
    expect(
      within(dialog).getByText(/that overlaps your current hours — 9:00 AM – 11:00 AM becomes/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Confirm the change\?/)).toBeInTheDocument();
  });

  it("shows NO conflict warning when the dry-run leaves hours unchanged (before == after, no trim)", async () => {
    const noopPreview: OverridePreviewResponse = {
      valid: true,
      message: null,
      days: [
        {
          date: "2026-07-20",
          resultingWindows: [{ startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T16:00:00Z" }],
          trimmed: [],
        },
      ],
    };
    mockUseOverrideMultiPreview.mockReturnValue({
      data: noopPreview,
      isLoading: false,
      isFetching: false,
    });

    renderModal();
    const dialog = screen.getByRole("dialog");

    await within(dialog).findByRole("group", { name: "After applying on 2026-07-20" });
    expect(within(dialog).queryByText(/This blocks time on/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Confirm the change\?/)).not.toBeInTheDocument();
  });

  it('shows NO conflict warning for "Add extra" (ADDITIONAL) even though the dry-run changes before→after', async () => {
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
    await user.click(within(dialog).getByRole("button", { name: "Add extra" }));

    // The After bar still shows the added window (Now/After rendering is unaffected)...
    await within(dialog).findByRole("group", { name: "After applying on 2026-07-20" });
    expect(await within(dialog).findByTitle(/Extra · 9:00 AM – 10:00 AM/)).toBeInTheDocument();
    // ...but no amber warning appears for Add extra.
    expect(within(dialog).queryByText(/This blocks time on/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Confirm the change\?/)).not.toBeInTheDocument();
  });

  it("shows NO conflict warning when before/after are the same instant expressed differently (Z vs .000Z)", async () => {
    mockUseResolvedAvailability.mockReturnValue({
      data: resolved([{ startAt: "2026-07-20T14:00:00Z", endAt: "2026-07-20T16:00:00Z" }]),
      isLoading: false,
    });
    const differentStringFormPreview: OverridePreviewResponse = {
      valid: true,
      message: null,
      days: [
        {
          date: "2026-07-20",
          resultingWindows: [
            { startAt: "2026-07-20T14:00:00.000Z", endAt: "2026-07-20T16:00:00.000Z" },
          ],
          trimmed: [],
        },
      ],
    };
    mockUseOverrideMultiPreview.mockReturnValue({
      data: differentStringFormPreview,
      isLoading: false,
      isFetching: false,
    });

    renderModal();
    const dialog = screen.getByRole("dialog");

    await within(dialog).findByRole("group", { name: "After applying on 2026-07-20" });
    expect(within(dialog).queryByText(/This blocks time on/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Confirm the change\?/)).not.toBeInTheDocument();
  });
});

describe("DateOverrideModal — Confirm creates one exception per slot", () => {
  it("Confirm with the default single slot creates one exception for the date range", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal(onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith({
      dateFrom: "2026-07-20",
      dateTo: "2026-07-20",
      kind: "UNAVAILABLE",
      startLocal: "09:00",
      windowMin: 60,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("adding a second time slot submits ONE create per slot", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /add time slot/i }));
    // Edit slot 2's end so the two slots differ (also dismisses the auto-opened wheel).
    await typeSegment(user, dialog, "Time slot 2 to hour", "11");

    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(2));
    expect(createMutate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ startLocal: "09:00", windowMin: 60 }),
    );
    expect(createMutate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ startLocal: "09:00", windowMin: 120 }),
    );
  });

  it("submits the '24:00' end-of-day sentinel (10 PM → 12 AM = 120 min) via the To TimePicker", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole("dialog");

    await typeSegment(user, dialog, "Time slot 1 from hour", "10");
    await setPeriod(user, dialog, "Time slot 1 from AM/PM", "PM");
    await typeSegment(user, dialog, "Time slot 1 to hour", "12");
    await setPeriod(user, dialog, "Time slot 1 to AM/PM", "AM");

    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ startLocal: "22:00", windowMin: 120 }),
    );
  });

  it("submits the multi-day date range to every create", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal(onClose);
    const dialog = screen.getByRole("dialog");

    const fromDate = within(dialog).getByLabelText("From date");
    const toDate = within(dialog).getByLabelText("To date");
    await user.clear(fromDate);
    await user.type(fromDate, "2026-07-20");
    await user.clear(toDate);
    await user.type(toDate, "2026-07-25");

    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: "2026-07-20", dateTo: "2026-07-25" }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});

describe("DateOverrideModal — per-slot structural validation (start < end only, never overlap)", () => {
  it("a slot whose start is not before its end shows an inline error and disables Confirm", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole("dialog");

    // Default slot is 9:00–10:00; move From to 10:00 so start === end (toWindowMin rejects).
    await typeSegment(user, dialog, "Time slot 1 from hour", "10");

    expect(
      await within(dialog).findByText(/start time must be before the end time/i),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Confirm change" })).toBeDisabled();
    expect(createMutate).not.toHaveBeenCalled();
  });
});

describe("DateOverrideModal — backend 422 keeps the modal open with an in-modal notification", () => {
  it("a mocked 422 from create keeps the modal open and shows the backend message", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    createMutate.mockRejectedValue(new ApiError(422, "This override conflicts with a booking."));
    renderModal(onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    expect(
      await within(dialog).findByText(/this override conflicts with a booking/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("a generic (non-ApiError) failure shows a fallback message and keeps the modal open", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    createMutate.mockRejectedValue(new Error("network down"));
    renderModal(onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    expect(await within(dialog).findByText(/could not save this override/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
