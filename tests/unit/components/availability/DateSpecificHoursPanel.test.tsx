import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateSpecificHoursPanel } from "@/components/availability/DateSpecificHoursPanel";
import type { AvailabilityException } from "@/lib/data-access";

const unavailableException: AvailabilityException = {
  id: "exc-1",
  exceptionDate: "2026-03-10",
  kind: "UNAVAILABLE",
  startLocal: "09:00",
  windowMin: 60,
  reason: "Doctor appointment",
};

const additionalException: AvailabilityException = {
  id: "exc-2",
  exceptionDate: "2026-04-01",
  kind: "ADDITIONAL",
  startLocal: "14:00",
  windowMin: 30,
  reason: null,
};

describe("DateSpecificHoursPanel", () => {
  it("shows an empty state when there are no exceptions", () => {
    render(
      <DateSpecificHoursPanel
        exceptions={[]}
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.getByText(/no date-specific hours yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /date-specific hours/i })).not.toBeInTheDocument();
  });

  it("renders an UNAVAILABLE exception with its date, kind badge, window, and reason", () => {
    render(
      <DateSpecificHoursPanel
        exceptions={[unavailableException]}
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    const list = screen.getByRole("list", { name: /^date-specific hours$/i });
    expect(within(list).getByText(/tue, mar 10, 2026/i)).toBeInTheDocument();
    expect(within(list).getByText("Unavailable (block time off)")).toBeInTheDocument();
    expect(within(list).getByText("9:00 AM · 1h")).toBeInTheDocument();
    expect(within(list).getByText("Doctor appointment")).toBeInTheDocument();
  });

  it("renders an ADDITIONAL exception with its badge and no reason paragraph", () => {
    render(
      <DateSpecificHoursPanel
        exceptions={[additionalException]}
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    const list = screen.getByRole("list", { name: /^date-specific hours$/i });
    expect(within(list).getByText("Extra availability")).toBeInTheDocument();
    expect(within(list).getByText("2:00 PM · 30m")).toBeInTheDocument();
    expect(within(list).queryByText("Doctor appointment")).not.toBeInTheDocument();
  });

  it("calls onAdd when the add button is clicked", async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();

    render(
      <DateSpecificHoursPanel
        exceptions={[]}
        onAdd={onAdd}
        onEdit={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^add date-specific hours$/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("calls onEdit with the clicked exception", async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();

    render(
      <DateSpecificHoursPanel
        exceptions={[unavailableException]}
        onAdd={jest.fn()}
        onEdit={onEdit}
        onRemove={jest.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /edit date-specific hours/i }));
    expect(onEdit).toHaveBeenCalledWith(unavailableException);
  });

  it("calls onRemove with the clicked exception", async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();

    render(
      <DateSpecificHoursPanel
        exceptions={[unavailableException]}
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole("button", { name: /remove date-specific hours/i }));
    expect(onRemove).toHaveBeenCalledWith(unavailableException);
  });

  it("disables Remove only for the exception matching removingId", () => {
    render(
      <DateSpecificHoursPanel
        exceptions={[unavailableException, additionalException]}
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onRemove={jest.fn()}
        removingId="exc-2"
      />,
    );

    const removeButtons = screen.getAllByRole("button", { name: /remove date-specific hours/i });
    expect(removeButtons[0]).toBeEnabled();
    expect(removeButtons[1]).toBeDisabled();
  });
});
