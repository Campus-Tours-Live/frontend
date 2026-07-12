import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import { DayHoursModal } from "@/components/availability/DayHoursModal";
import {
  ApiError,
  useCreateAvailabilityRule,
  useDeleteAvailabilityRule,
  useUpdateAvailabilityRule,
} from "@/lib/data-access";
import type { AvailabilityRule } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useCreateAvailabilityRule: jest.fn(),
  useUpdateAvailabilityRule: jest.fn(),
  useDeleteAvailabilityRule: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message?: string) {
      super(message ?? `HTTP ${status}`);
      this.status = status;
      this.name = "ApiError";
    }
  },
}));

const mockUseCreateAvailabilityRule = useCreateAvailabilityRule as jest.Mock;
const mockUseUpdateAvailabilityRule = useUpdateAvailabilityRule as jest.Mock;
const mockUseDeleteAvailabilityRule = useDeleteAvailabilityRule as jest.Mock;

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

let createMutate: jest.Mock;
let updateMutate: jest.Mock;
let deleteMutate: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  createMutate = jest.fn().mockResolvedValue(undefined);
  updateMutate = jest.fn().mockResolvedValue(undefined);
  deleteMutate = jest.fn().mockResolvedValue(undefined);
  mockUseCreateAvailabilityRule.mockReturnValue({ mutateAsync: createMutate, isPending: false });
  mockUseUpdateAvailabilityRule.mockReturnValue({ mutateAsync: updateMutate, isPending: false });
  mockUseDeleteAvailabilityRule.mockReturnValue({ mutateAsync: deleteMutate, isPending: false });
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

/** Set a TimePicker's value via its click-to-type inline input (jsdom can't scroll the wheel). */
async function typeTime(user: UserEvent, scope: HTMLElement, labelRe: RegExp, text: string) {
  await user.click(within(scope).getByRole("button", { name: labelRe }));
  const input = within(scope).getByRole("textbox");
  await user.clear(input);
  await user.type(input, text);
  await user.keyboard("{Enter}");
}

describe("DayHoursModal — prefill + layout", () => {
  it("prefills From/To from an existing rule (09:00 → 13:00 shown as 9:00 AM / 1:00 PM)", () => {
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");
    const range = within(dialog).getByRole("group", { name: "Range 1" });
    expect(
      within(range).getByRole("button", { name: /range 1 from: 9:00 AM/i }),
    ).toBeInTheDocument();
    expect(within(range).getByRole("button", { name: /range 1 to: 1:00 PM/i })).toBeInTheDocument();
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

describe("DayHoursModal — Save reconciles create/update/delete", () => {
  it("adding a range and Save submits {dayOfWeek, startLocal, windowMin} via toWindowMin", async () => {
    const user = userEvent.setup();
    renderModal([]);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /add time range/i }));
    const range = within(dialog).getByRole("group", { name: "Range 1" });

    // Default new range is 09:00–10:00; set the To to 1:00 PM (13:00 → windowMin 240).
    await typeTime(user, range, /range 1 to.*edit as text/i, "1:00 PM");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith({
      dayOfWeek: 1,
      startLocal: "09:00",
      windowMin: 240,
    });
  });

  it("setting an existing range's To to 12:00 AM (end of day) updates with windowMin 900", async () => {
    const user = userEvent.setup();
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");
    const range = within(dialog).getByRole("group", { name: "Range 1" });

    // TO picker has midnightIsEndOfDay → typing 12:00 AM yields the "24:00" sentinel.
    await typeTime(user, range, /range 1 to.*edit as text/i, "12:00 AM");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate).toHaveBeenCalledWith({
      id: "rule-mon-1",
      body: { startLocal: "09:00", windowMin: 900 },
    });
  });

  it("removing an existing range and Save calls delete with that rule's id", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal([mondayRule], onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /remove range 1/i }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith("rule-mon-1"));
    expect(onClose).toHaveBeenCalled();
  });

  it("Save with no changes closes without calling any mutation", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal([mondayRule], onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createMutate).not.toHaveBeenCalled();
    expect(updateMutate).not.toHaveBeenCalled();
    expect(deleteMutate).not.toHaveBeenCalled();
  });
});

describe("DayHoursModal — backend 422 keeps the modal open with an in-modal error alert", () => {
  it("a mocked 422 from create keeps the modal open and shows the backend message", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    createMutate.mockRejectedValue(new ApiError(422, "This range overlaps an existing one."));
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
    createMutate.mockRejectedValue(new Error("network down"));
    renderModal([], onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /add time range/i }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText(/could not save these hours/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("DayHoursModal — client-side structural validation (from<to only, never overlap)", () => {
  it("an invalid from/to pairing (to not after from) shows a validation message and saves nothing", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal([mondayRule], onClose);
    const dialog = screen.getByRole("dialog");
    const range = within(dialog).getByRole("group", { name: "Range 1" });

    // Set From equal to the current To (1:00 PM / 13:00) — toWindowMin throws on to<=from.
    await typeTime(user, range, /range 1 from.*edit as text/i, "1:00 PM");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText(/must be after/i)).toBeInTheDocument();
    expect(createMutate).not.toHaveBeenCalled();
    expect(updateMutate).not.toHaveBeenCalled();
    expect(deleteMutate).not.toHaveBeenCalled();
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
    expect(createMutate).not.toHaveBeenCalled();
    expect(updateMutate).not.toHaveBeenCalled();
  });
});
