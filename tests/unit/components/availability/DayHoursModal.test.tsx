import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("DayHoursModal — prefill + display", () => {
  it("prefills From/To from an existing rule via windowToRawTo (raw, round-trippable value)", () => {
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");
    const range = within(dialog).getByRole("group", { name: "Range 1" });
    expect(within(range).getByLabelText("From")).toHaveValue("09:00");
    expect(within(range).getByLabelText("To")).toHaveValue("13:00");
  });

  it("shows the settings timezone and the past-midnight hint", () => {
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/america\/chicago/i)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/to offer hours past midnight, add a range on the next day/i),
    ).toBeInTheDocument();
  });

  it("shows an empty state and no ranges when the day has no rules yet", () => {
    renderModal([]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("group")).not.toBeInTheDocument();
    expect(within(dialog).getByText(/no hours yet/i)).toBeInTheDocument();
  });

  it("the To picker offers a 12:00 AM (midnight) option whose value is the '24:00' sentinel", () => {
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");
    const range = within(dialog).getByRole("group", { name: "Range 1" });
    const toSelect = within(range).getByLabelText("To") as HTMLSelectElement;
    const midnightOption = within(toSelect).getByText(
      /12:00 am \(midnight\)/i,
    ) as HTMLOptionElement;
    expect(midnightOption.value).toBe("24:00");
  });
});

describe("DayHoursModal — add / remove ranges", () => {
  it("adding a range renders a second group with default from/to values", async () => {
    const user = userEvent.setup();
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /\+ add range/i }));

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

    await user.click(within(dialog).getByRole("button", { name: /\+ add range/i }));
    const range = within(dialog).getByRole("group", { name: "Range 1" });

    await user.clear(within(range).getByLabelText("From"));
    await user.type(within(range).getByLabelText("From"), "09:00");
    await user.selectOptions(within(range).getByLabelText("To"), "13:00");

    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith({
      dayOfWeek: 1,
      startLocal: "09:00",
      windowMin: 240,
    });
  });

  it("changing an existing range's To and Save calls update with {id, body:{startLocal,windowMin}}", async () => {
    const user = userEvent.setup();
    renderModal([mondayRule]);
    const dialog = screen.getByRole("dialog");
    const range = within(dialog).getByRole("group", { name: "Range 1" });

    await user.selectOptions(within(range).getByLabelText("To"), "24:00");
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

describe("DayHoursModal — backend 422 keeps the modal open with an in-modal notification", () => {
  it("a mocked 422 from create keeps the modal open and shows the backend message", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    createMutate.mockRejectedValue(new ApiError(422, "This range overlaps an existing one."));
    renderModal([], onClose);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /\+ add range/i }));
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

    await user.click(within(dialog).getByRole("button", { name: /\+ add range/i }));
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

    // Set From equal to the current To (13:00) — toWindowMin throws on to<=from.
    await user.clear(within(range).getByLabelText("From"));
    await user.type(within(range).getByLabelText("From"), "13:00");

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
