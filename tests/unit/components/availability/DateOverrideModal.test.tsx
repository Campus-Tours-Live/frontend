import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateOverrideModal } from "@/components/availability/DateOverrideModal";
import {
  ApiError,
  useAvailabilitySettings,
  useCreateAvailabilityException,
  useOverridePreview,
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

const mockUseAvailabilitySettings = useAvailabilitySettings as jest.Mock;
const mockUseResolvedAvailability = useResolvedAvailability as jest.Mock;
const mockUseOverridePreview = useOverridePreview as jest.Mock;
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
  mockUseOverridePreview.mockReturnValue({ data: undefined, isLoading: false, isFetching: false });
  createMutate = jest.fn().mockResolvedValue(undefined);
  mockUseCreateAvailabilityException.mockReturnValue({
    mutateAsync: createMutate,
    isPending: false,
  });
});

/** A dry-run where a 09:30–11:00 block trims the existing 10:00–11:00 weekly tail: the resulting
 *  window shrinks to 9:00–9:30 and 10:00–11:00 is trimmed. */
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

describe("DateOverrideModal — the info alert", () => {
  it("shows the persistent single-day-override note pointing at Weekly hours", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/single-day override/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/does not change your weekly hours/i)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/for recurring changes, use weekly hours/i),
    ).toBeInTheDocument();
  });
});

describe("DateOverrideModal — title", () => {
  it("renders the weekday + M/D title and the eyebrow", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Date-specific override")).toBeInTheDocument();
    // 2026-07-20 is a Monday.
    expect(
      within(dialog).getByRole("heading", { name: /Date-specific hours · Mon 7\/20/ }),
    ).toBeInTheDocument();
  });
});

describe("DateOverrideModal — dry-run preview: time-axis Now/After bars + legend", () => {
  it("fires useOverridePreview with the entered params and renders Now/After segments + legend", async () => {
    const user = userEvent.setup();
    mockUseOverridePreview.mockReturnValue({
      data: blockingPreview,
      isLoading: false,
      isFetching: false,
    });

    renderModal();
    const dialog = screen.getByRole("dialog");

    await user.clear(within(dialog).getByLabelText("From"));
    await user.type(within(dialog).getByLabelText("From"), "09:30");
    await user.selectOptions(within(dialog).getByLabelText("To"), "11:00");

    await waitFor(() =>
      expect(mockUseOverridePreview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          dateFrom: "2026-07-20",
          dateTo: "2026-07-20",
          kind: "UNAVAILABLE",
          startLocal: "09:30",
          windowMin: 90,
        }),
      ),
    );

    // "Now" bar = the current (before) window 9:00–11:00, bucketed from resolved availability.
    const nowBar = await within(dialog).findByRole("group", {
      name: "Current hours on 2026-07-20",
    });
    expect(within(nowBar).getByTitle(/Available · 9:00 AM – 11:00 AM/)).toBeInTheDocument();

    // "After" bar = the resulting 9:00–9:30 (green Available) plus the trimmed 10:00–11:00
    // rendered hatched as "Time off".
    const afterBar = within(dialog).getByRole("group", { name: "After applying on 2026-07-20" });
    expect(within(afterBar).getByTitle(/Available · 9:00 AM – 9:30 AM/)).toBeInTheDocument();
    const timeOff = within(afterBar).getByTitle(/Time off · 10:00 AM – 11:00 AM/);
    expect(timeOff).toBeInTheDocument();
    expect(timeOff).toHaveClass("calendar-hatch");

    // Legend: Available (green) · Time off (hatched) · Extra (blue).
    expect(within(dialog).getByText("Available")).toBeInTheDocument();
    expect(within(dialog).getByText("Time off")).toBeInTheDocument();
    expect(within(dialog).getByText("Extra")).toBeInTheDocument();
  });

  it("renders the proposed override as a blue Extra segment in Add-extra mode", async () => {
    const user = userEvent.setup();
    // No trims, but the after windows differ (extra added) → an Extra band shows on After.
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
    mockUseOverridePreview.mockReturnValue({
      data: extraPreview,
      isLoading: false,
      isFetching: false,
    });

    renderModal();
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Add extra" }));
    await user.clear(within(dialog).getByLabelText("From"));
    await user.type(within(dialog).getByLabelText("From"), "13:00");
    await user.selectOptions(within(dialog).getByLabelText("To"), "14:00");

    const afterBar = await within(dialog).findByRole("group", {
      name: "After applying on 2026-07-20",
    });
    const extra = within(afterBar).getByTitle(/Extra · 1:00 PM – 2:00 PM/);
    expect(extra).toBeInTheDocument();
    expect(extra).toHaveClass("bg-primary");
  });
});

describe("DateOverrideModal — conflict warning", () => {
  it("shows the amber conflict warning with a block-framed before→after message when a block trims (UNAVAILABLE)", async () => {
    const user = userEvent.setup();
    mockUseOverridePreview.mockReturnValue({
      data: blockingPreview,
      isLoading: false,
      isFetching: false,
    });

    renderModal();
    const dialog = screen.getByRole("dialog");
    // Default mode is UNAVAILABLE (Block time off) — no need to toggle.

    await user.clear(within(dialog).getByLabelText("From"));
    await user.type(within(dialog).getByLabelText("From"), "09:30");
    await user.selectOptions(within(dialog).getByLabelText("To"), "11:00");

    const warning = await within(dialog).findByText(/This blocks time on Mon 7\/20/);
    expect(warning).toBeInTheDocument();
    // Block-framed: names the overlap and what it becomes — never the old "overrides"/"Extra" prose.
    expect(
      within(dialog).getByText(/that overlaps your current hours — 9:00 AM – 11:00 AM becomes/),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/becomes Extra/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/This overrides the current hours/)).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Confirm the change\?/)).toBeInTheDocument();
  });

  it("shows NO conflict warning when the dry-run leaves hours unchanged (before == after, no trim)", async () => {
    // resultingWindows equal the existing before window, and nothing is trimmed → no conflict.
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
    mockUseOverridePreview.mockReturnValue({
      data: noopPreview,
      isLoading: false,
      isFetching: false,
    });

    renderModal();
    const dialog = screen.getByRole("dialog");

    // Give the preview a beat to render.
    await within(dialog).findByRole("group", { name: "After applying on 2026-07-20" });
    expect(within(dialog).queryByText(/This blocks time on/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Confirm the change\?/)).not.toBeInTheDocument();
  });

  it('shows NO conflict warning for "Add extra" (ADDITIONAL) even though the dry-run changes before→after', async () => {
    const user = userEvent.setup();
    // Same shape as the "Extra" bar test above: no trims, but resultingWindows differ from before
    // (a window is added to an otherwise-unchanged day) — ADDITIONAL must never warn on this.
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
    mockUseOverridePreview.mockReturnValue({
      data: extraPreview,
      isLoading: false,
      isFetching: false,
    });

    renderModal();
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Add extra" }));
    await user.clear(within(dialog).getByLabelText("From"));
    await user.type(within(dialog).getByLabelText("From"), "13:00");
    await user.selectOptions(within(dialog).getByLabelText("To"), "14:00");

    // The After bar still shows the added window (Now/After dry-run rendering is unaffected)...
    const afterBar = await within(dialog).findByRole("group", {
      name: "After applying on 2026-07-20",
    });
    expect(within(afterBar).getByTitle(/Extra · 1:00 PM – 2:00 PM/)).toBeInTheDocument();
    // ...but no amber warning appears for Add extra — only the persistent info alert
    // ("single-day override") remains, never the conflict warning's "This blocks time on" text.
    expect(within(dialog).queryByText(/This blocks time on/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Confirm the change\?/)).not.toBeInTheDocument();
  });

  it("shows NO conflict warning when before/after are the same instant expressed with different string forms (Z vs .000Z)", async () => {
    // Guards the instant-based windowsEqual fix: the resolved-availability "before" window ends
    // with a bare "Z" while the dry-run's "after" resultingWindows ends with ".000Z" — same
    // instant, different serialization. A raw-string compare would wrongly flag this as a
    // conflict; the instant-based compare must not.
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
    mockUseOverridePreview.mockReturnValue({
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

describe("DateOverrideModal — Confirm", () => {
  it('Confirm calls createException with {dateFrom,dateTo,kind:"UNAVAILABLE",startLocal:"09:30",windowMin:90}', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal(onClose);
    const dialog = screen.getByRole("dialog");

    await user.clear(within(dialog).getByLabelText("From"));
    await user.type(within(dialog).getByLabelText("From"), "09:30");
    await user.selectOptions(within(dialog).getByLabelText("To"), "11:00");

    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith({
      dateFrom: "2026-07-20",
      dateTo: "2026-07-20",
      kind: "UNAVAILABLE",
      startLocal: "09:30",
      windowMin: 90,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("Confirm submits the '24:00' end-of-day sentinel as windowMin to midnight", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal(onClose);
    const dialog = screen.getByRole("dialog");

    await user.clear(within(dialog).getByLabelText("From"));
    await user.type(within(dialog).getByLabelText("From"), "22:00");
    await user.selectOptions(within(dialog).getByLabelText("To"), "24:00");

    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    // 22:00 → 24:00 (midnight) = 120 minutes.
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ startLocal: "22:00", windowMin: 120 }),
    );
  });

  it("the To picker offers a 12:00 AM (midnight) option whose value is the '24:00' sentinel", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    const toSelect = within(dialog).getByLabelText("To") as HTMLSelectElement;
    const midnightOption = within(toSelect).getByText(
      /12:00 am \(midnight\)/i,
    ) as HTMLOptionElement;
    expect(midnightOption.value).toBe("24:00");
  });

  it('the To picker does NOT offer a "00:00" option (N1: ambiguous duplicate of "24:00")', () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    const toSelect = within(dialog).getByLabelText("To") as HTMLSelectElement;
    const values = within(toSelect)
      .getAllByRole<HTMLOptionElement>("option")
      .map((option) => option.value);
    expect(values).not.toContain("00:00");
    expect(values).toContain("24:00");
  });
});

describe("DateOverrideModal — backend 422 keeps the modal open with an in-modal notification", () => {
  it("a mocked 422 from create keeps the modal open and shows the backend message", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    createMutate.mockRejectedValue(new ApiError(422, "The date range is too long (max 366 days)."));
    renderModal(onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    expect(
      await within(dialog).findByText(/the date range is too long \(max 366 days\)/i),
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

describe("DateOverrideModal — client-side structural validation (from<to only, never overlap)", () => {
  it("an invalid from/to pairing shows a validation message and never calls createException", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal(onClose);
    const dialog = screen.getByRole("dialog");

    // Default From/To is 09:00-10:00; set From equal to To so toWindowMin throws (to<=from).
    await user.clear(within(dialog).getByLabelText("From"));
    await user.type(within(dialog).getByLabelText("From"), "10:00");

    await user.click(within(dialog).getByRole("button", { name: "Confirm change" }));

    expect(await within(dialog).findByText(/enter a valid from–to range/i)).toBeInTheDocument();
    expect(createMutate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("DateOverrideModal — multi-day date range", () => {
  it("editing the From date/To date fields submits the multi-day range to createException", async () => {
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
