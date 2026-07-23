import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import {
  DayHoursModal,
  dayHoursErrorMessage,
  structuralRangeError,
} from "@/components/availability/DayHoursModal";
import { toWindowMin } from "@/lib/availability/fromTo";
import { ApiError, useReplaceRules, useUpdateAvailabilityRule } from "@/lib/data-access";
import type { AvailabilityRule } from "@/lib/data-access";

// Wraps the REAL fromTo helpers so every existing test keeps using real time math; only the
// "defensive fallback" tests below arm `toWindowMin` with a one-shot throw to simulate it
// unexpectedly rejecting exactly at Save-time (see that describe block).
jest.mock("@/lib/availability/fromTo", () => {
  const actual = jest.requireActual("@/lib/availability/fromTo");
  return { ...actual, toWindowMin: jest.fn(actual.toWindowMin) };
});

jest.mock("@/lib/data-access", () => ({
  useUpdateAvailabilityRule: jest.fn(),
  useReplaceRules: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message?: string) {
      super(message ?? `HTTP ${status}`);
      this.status = status;
      this.name = "ApiError";
    }
  },
}));

const mockUseUpdateAvailabilityRule = useUpdateAvailabilityRule as jest.Mock;
const mockUseReplaceRules = useReplaceRules as jest.Mock;

const mondayRule: AvailabilityRule = {
  id: "rule-mon-1",
  dayOfWeek: 1,
  startLocal: "09:00",
  windowMin: 240,
  timezone: "America/Chicago",
  effectiveFrom: null,
  effectiveTo: null,
  active: true,
};

let updateMutate: jest.Mock;
let replaceMutate: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  updateMutate = jest.fn().mockResolvedValue(undefined);
  replaceMutate = jest.fn().mockResolvedValue({ data: [], affectedBookings: [] });
  mockUseUpdateAvailabilityRule.mockReturnValue({ mutateAsync: updateMutate, isPending: false });
  mockUseReplaceRules.mockReturnValue({ mutateAsync: replaceMutate, isPending: false });
});

function renderModal(rules: AvailabilityRule[] = [], onClose = jest.fn()) {
  render(
    <DayHoursModal
      open
      dayOfWeek={1}
      dayLabel="Monday"
      rules={rules}
      settingsTimezone="America/Chicago"
      onClose={onClose}
    />,
  );
  return { onClose };
}

/** Type into a TimePicker hour/minute segment (jsdom can't scroll the wheel). */
async function typeSegment(user: UserEvent, scope: HTMLElement, name: string, text: string) {
  const el = within(scope).getByRole("textbox", { name });
  await user.clear(el);
  await user.type(el, text);
}

/** Set a TimePicker's AM/PM segment. */
async function setPeriod(user: UserEvent, scope: HTMLElement, name: string, ampm: "AM" | "PM") {
  const el = within(scope).getByRole("textbox", { name });
  await user.click(el);
  await user.keyboard(ampm === "PM" ? "p" : "a");
}

describe("DayHoursModal — prefill + layout", () => {
  it("prefills From/To segments from an existing rule (09:00 → 13:00 = 9:00 AM / 1:00 PM)", () => {
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");
    const range = within(dialog).getByRole("group", { name: "Range 1" });
    expect(within(range).getByRole("textbox", { name: "Range 1 from hour" })).toHaveValue("9");
    expect(within(range).getByRole("textbox", { name: "Range 1 from minutes" })).toHaveValue("00");
    expect(within(range).getByRole("textbox", { name: "Range 1 from AM/PM" })).toHaveValue("AM");
    expect(within(range).getByRole("textbox", { name: "Range 1 to hour" })).toHaveValue("1");
    expect(within(range).getByRole("textbox", { name: "Range 1 to AM/PM" })).toHaveValue("PM");
  });

  it("shows the persistent info alert about hours past midnight", () => {
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(/hours that pass midnight should be added to the next day/i),
    ).toBeInTheDocument();
  });

  it("shows the settings timezone", () => {
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/america\/chicago/i)).toBeInTheDocument();
  });

  it("shows an empty state and no ranges when the day has no rules yet", () => {
    renderModal([]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("group")).not.toBeInTheDocument();
    expect(within(dialog).getByText(/no hours yet/i)).toBeInTheDocument();
  });

  it("each range renders two TimePickers (from + to) and a delete button", () => {
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");
    const range = within(dialog).getByRole("group", { name: "Range 1" });
    expect(
      within(range).getByRole("button", { name: /open range 1 from picker/i }),
    ).toBeInTheDocument();
    expect(
      within(range).getByRole("button", { name: /open range 1 to picker/i }),
    ).toBeInTheDocument();
    expect(within(range).getByRole("button", { name: /remove range 1/i })).toBeInTheDocument();
  });
});

describe("DayHoursModal — add / remove ranges", () => {
  it("adding a range renders a second group", async () => {
    const user = userEvent.setup();
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /add time range/i }));

    expect(within(dialog).getByRole("group", { name: "Range 2" })).toBeInTheDocument();
  });

  it("removing a range removes its group from the form", async () => {
    const user = userEvent.setup();
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /remove range 1/i }));

    expect(within(dialog).queryByRole("group", { name: "Range 1" })).not.toBeInTheDocument();
    expect(within(dialog).getByText(/no hours yet/i)).toBeInTheDocument();
  });
});

describe("DayHoursModal — editing one range leaves sibling ranges untouched", () => {
  it("editing Range 1 does not alter Range 2's values", async () => {
    const user = userEvent.setup();
    const secondRule: AvailabilityRule = {
      id: "rule-mon-2",
      dayOfWeek: 1,
      startLocal: "15:00",
      windowMin: 60,
      timezone: "America/Chicago",
      effectiveFrom: null,
      effectiveTo: null,
      active: true,
    };
    renderModal([mondayRule, secondRule]);
    const dialog = screen.getByRole("dialog");
    const range1 = within(dialog).getByRole("group", { name: "Range 1" });

    await typeSegment(user, range1, "Range 1 from hour", "8");

    const range2 = within(dialog).getByRole("group", { name: "Range 2" });
    expect(within(range2).getByRole("textbox", { name: "Range 2 from hour" })).toHaveValue("3");
    expect(within(range2).getByRole("textbox", { name: "Range 2 from AM/PM" })).toHaveValue("PM");
    expect(within(range2).getByRole("textbox", { name: "Range 2 to hour" })).toHaveValue("4");
    expect(within(range2).getByRole("textbox", { name: "Range 2 to AM/PM" })).toHaveValue("PM");
  });
});

describe("DayHoursModal — Save via ONE atomic useReplaceRules call", () => {
  it("adding a range and Save submits the weekday as ONE {dayOfWeek, windows} replace", async () => {
    const user = userEvent.setup();
    renderModal([]);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /add time range/i }));
    const range = within(dialog).getByRole("group", { name: "Range 1" });

    // Default new range is 09:00–10:00; set the To to 1:00 PM (13:00 → windowMin 240).
    await typeSegment(user, range, "Range 1 to hour", "1");
    await setPeriod(user, range, "Range 1 to AM/PM", "PM");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(replaceMutate).toHaveBeenCalledTimes(1));
    expect(replaceMutate).toHaveBeenCalledWith({
      dayOfWeek: 1,
      windows: [{ startLocal: "09:00", windowMin: 240 }],
    });
    // Old per-rule reconcile path is gone.
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it("keeps the modal open with an affected-bookings notice when the save overlaps a booking", async () => {
    const user = userEvent.setup();
    replaceMutate.mockResolvedValue({
      data: [],
      affectedBookings: [
        {
          bookingId: "bk1",
          bookingNumber: "BK-88",
          status: "CONFIRMED",
          scheduledStartAt: "2026-07-20T15:00:00Z",
          scheduledEndAt: "2026-07-20T16:00:00Z",
        },
      ],
    });
    const { onClose } = renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    // Allow + notify: the save succeeded, but the modal stays open to surface the affected booking.
    await within(dialog).findByText(/existing booking/i);
    expect(within(dialog).getByText("BK-88")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    // Footer collapses to a single Done that closes.
    expect(within(dialog).queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("editing an existing range's To to 12:00 AM (end of day) replaces with windowMin 900", async () => {
    const user = userEvent.setup();
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");
    const range = within(dialog).getByRole("group", { name: "Range 1" });

    // TO picker has midnightIsEndOfDay → 12:00 AM yields the "24:00" sentinel.
    await typeSegment(user, range, "Range 1 to hour", "12");
    await setPeriod(user, range, "Range 1 to AM/PM", "AM");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(replaceMutate).toHaveBeenCalledTimes(1));
    expect(replaceMutate).toHaveBeenCalledWith({
      dayOfWeek: 1,
      windows: [{ startLocal: "09:00", windowMin: 900 }],
    });
  });

  it("removing every range and Save replaces with EMPTY windows (clears the weekday)", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal([mondayRule], onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /remove range 1/i }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(replaceMutate).toHaveBeenCalledWith({ dayOfWeek: 1, windows: [] }));
    expect(updateMutate).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("Save with no edits still replaces the weekday with its current windows, then closes", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal([mondayRule], onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(replaceMutate).toHaveBeenCalledTimes(1);
    expect(replaceMutate).toHaveBeenCalledWith({
      dayOfWeek: 1,
      windows: [{ startLocal: "09:00", windowMin: 240 }],
    });
    expect(updateMutate).not.toHaveBeenCalled();
  });
});

describe("DayHoursModal — backend 422 keeps the modal open with an in-modal error alert", () => {
  it("a mocked 422 from replace keeps the modal open and shows the backend message", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    replaceMutate.mockRejectedValue(new ApiError(422, "This range overlaps an existing one."));
    renderModal([], onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /add time range/i }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(
      await within(dialog).findByText(/this range overlaps an existing one/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("a generic (non-ApiError) failure shows a fallback message and keeps the modal open", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    replaceMutate.mockRejectedValue(new Error("network down"));
    renderModal([], onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /add time range/i }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText(/could not save these hours/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("DayHoursModal — client-side structural validation (from<to only, never overlap)", () => {
  it("start-after-end shows an inline row error, disables Save, and never mutates", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal([mondayRule], onClose);
    const dialog = screen.getByRole("dialog");
    const range = within(dialog).getByRole("group", { name: "Range 1" });

    // Set From equal to the current To (1:00 PM / 13:00) — toWindowMin rejects to<=from.
    await typeSegment(user, range, "Range 1 from hour", "1");
    await setPeriod(user, range, "Range 1 from AM/PM", "PM");

    // Blocked live: inline error appears and Save is disabled — no click needed.
    expect(
      await within(dialog).findByText(/start time must be before the end time/i),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();

    expect(replaceMutate).not.toHaveBeenCalled();
    expect(updateMutate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("DayHoursModal — Cancel", () => {
  it("Cancel closes without calling any mutation", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal([mondayRule], onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(updateMutate).not.toHaveBeenCalled();
  });
});

describe("DayHoursModal — structuralRangeError (pure, the exported per-row structural check)", () => {
  it("returns null for a structurally valid from-before-to pair", () => {
    expect(structuralRangeError("09:00", "17:00")).toBeNull();
  });

  it("returns the friendly message when start is not before end", () => {
    expect(structuralRangeError("17:00", "09:00")).toBe("Start time must be before the end time.");
  });
});

describe("DayHoursModal — dayHoursErrorMessage (pure, surfaces the write-time 422 verbatim)", () => {
  it("surfaces a 422 ApiError's message verbatim", () => {
    expect(dayHoursErrorMessage(new ApiError(422, "This range overlaps another one."))).toBe(
      "This range overlaps another one.",
    );
  });

  it("falls back to the overlap notice when a 422 ApiError carries no message", () => {
    expect(dayHoursErrorMessage(new ApiError(422, ""))).toBe(
      "That range overlaps another one on this day.",
    );
  });

  it("falls back to a generic notice for a non-422 ApiError", () => {
    expect(dayHoursErrorMessage(new ApiError(500, "boom"))).toBe(
      "Could not save these hours. Please try again.",
    );
  });
});

describe("DayHoursModal — defensive fallback when toWindowMin throws while building the save payload", () => {
  it("shows the thrown Error's own message when toWindowMin unexpectedly throws an Error exactly at Save-time", async () => {
    // hasStructuralError already disables Save for a genuinely invalid row (covered elsewhere), so
    // this exercises handleSave's own defensive catch by making the shared `toWindowMin` helper
    // reject exactly once, for the call handleSave makes when building the atomic replace payload —
    // e.g. a TimePicker race producing a value that passed the live check but fails at submit.
    const user = userEvent.setup();
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeEnabled();

    (toWindowMin as jest.Mock).mockImplementationOnce(() => {
      throw new Error("simulated race");
    });
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText("simulated race")).toBeInTheDocument();
    expect(replaceMutate).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when toWindowMin throws a non-Error value at Save-time", async () => {
    const user = userEvent.setup();
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");

    (toWindowMin as jest.Mock).mockImplementationOnce(() => {
      throw "not an Error instance";
    });
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText(/enter a valid from.to range/i)).toBeInTheDocument();
    expect(replaceMutate).not.toHaveBeenCalled();
  });
});
