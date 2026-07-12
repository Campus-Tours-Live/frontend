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

function renderModal(onClose = jest.fn()) {
  render(<DateOverrideModal open initialDate="2026-07-20" onClose={onClose} />);
  return { onClose };
}

describe("DateOverrideModal — mode toggle", () => {
  it("switching mode toggles kind (Confirm submits the newly selected kind)", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /add extra availability/i }));
    await user.click(within(dialog).getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({ kind: "ADDITIONAL" }));
  });
});

describe("DateOverrideModal — the 'not weekly' note", () => {
  it("shows a prominent note that this is a single-day override and does not change weekly hours", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/single-day override/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/does not change your weekly hours/i)).toBeInTheDocument();
  });
});

describe("DateOverrideModal — dry-run before/after preview", () => {
  it("entering Block 09:30-11:00 triggers useOverridePreview with those params and renders before/after with time labels + trimmed", async () => {
    const user = userEvent.setup();

    const preview: OverridePreviewResponse = {
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
    mockUseOverridePreview.mockReturnValue({ data: preview, isLoading: false, isFetching: false });

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

    // "before" (from useResolvedAvailability, bucketed via bucketOccurrencesByDate, settings tz)
    expect(await within(dialog).findByText(/9:00 AM – 11:00 AM/)).toBeInTheDocument();
    // "after" (from the preview response's resultingWindows) — time-labelled
    expect(within(dialog).getByText(/9:00 AM – 9:30 AM/)).toBeInTheDocument();
    // "trimmed" (from the preview response's trimmed[])
    expect(within(dialog).getByText(/10:00 AM – 11:00 AM/)).toBeInTheDocument();
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

    await user.click(within(dialog).getByRole("button", { name: "Confirm" }));

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

    await user.click(within(dialog).getByRole("button", { name: "Confirm" }));

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

    await user.click(within(dialog).getByRole("button", { name: "Confirm" }));

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

    await user.click(within(dialog).getByRole("button", { name: "Confirm" }));

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

    await user.click(within(dialog).getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: "2026-07-20", dateTo: "2026-07-25" }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
