import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ExceptionFormModal,
  exceptionFormErrorMessage,
} from "@/components/availability/ExceptionFormModal";
import { ApiError } from "@/lib/data-access";

describe("ExceptionFormModal", () => {
  it("submits exceptionDate + kind + start+duration as the Task-1 shape — no endLocal", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(<ExceptionFormModal open onClose={jest.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "22:00" } });
    await user.selectOptions(screen.getByLabelText("Availability window"), "240");

    await user.click(screen.getByRole("button", { name: "Add exception" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        exceptionDate: "2026-08-01",
        kind: "UNAVAILABLE",
        startLocal: "22:00",
        windowMin: 240,
      }),
    );
    expect(payload).not.toHaveProperty("endLocal");
    expect(payload).not.toHaveProperty("timezone");
  });

  it("submits the ADDITIONAL kind when the guide adds extra availability", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(<ExceptionFormModal open onClose={jest.fn()} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText("Exception type"), "ADDITIONAL");
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "20:00" } });
    await user.selectOptions(screen.getByLabelText("Availability window"), "240");

    await user.click(screen.getByRole("button", { name: "Add exception" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({ kind: "ADDITIONAL", startLocal: "20:00", windowMin: 240 });
  });

  it("submits a blank reason as null, and a filled reason trimmed", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(<ExceptionFormModal open onClose={jest.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Reason (optional)"), "  Family event  ");
    await user.click(screen.getByRole("button", { name: "Add exception" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].reason).toBe("Family event");
  });

  it("prefills edit values from the initial exception using windowMin (no endLocal)", () => {
    render(
      <ExceptionFormModal
        open
        onClose={jest.fn()}
        initial={{
          id: "e1",
          exceptionDate: "2026-08-01",
          kind: "ADDITIONAL",
          startLocal: "13:00",
          windowMin: 90,
          reason: "Special event",
        }}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Edit date-specific hours" })).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveValue("2026-08-01");
    expect(screen.getByLabelText("Exception type")).toHaveValue("ADDITIONAL");
    expect(screen.getByLabelText("Start time")).toHaveValue("13:00");
    expect(screen.getByLabelText("Availability window")).toHaveValue("90");
    expect(screen.queryByLabelText("End time")).not.toBeInTheDocument();
  });

  it("prefills a non-preset windowMin into the custom-minutes input", () => {
    render(
      <ExceptionFormModal
        open
        onClose={jest.fn()}
        initial={{
          id: "e2",
          exceptionDate: "2026-08-01",
          kind: "UNAVAILABLE",
          startLocal: "10:00",
          windowMin: 75,
          reason: null,
        }}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Availability window")).toHaveValue("custom");
    expect(screen.getByLabelText("Custom minutes")).toHaveValue(75);
  });

  it("shows the server error banner and a 'Saving…' submit label while submitting", () => {
    render(
      <ExceptionFormModal
        open
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        submitting
        error="Could not save the exception. Please try again."
      />,
    );

    expect(screen.getByText("Could not save the exception. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  it("rejects an invalid custom duration without silently submitting a value", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(<ExceptionFormModal open onClose={jest.fn()} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText("Availability window"), "custom");
    await user.click(screen.getByRole("button", { name: "Add exception" }));

    expect(await screen.findByText("Enter a valid duration in minutes.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces server validation errors via exceptionFormErrorMessage", () => {
    expect(exceptionFormErrorMessage(new ApiError(422, "Overlap"))).toBe("Overlap");
    expect(exceptionFormErrorMessage(new ApiError(422, ""))).toMatch(/overlaps another entry/i);
    expect(exceptionFormErrorMessage(new ApiError(500))).toMatch(/Could not save the exception/i);
    expect(exceptionFormErrorMessage(new Error("network"))).toMatch(
      /Could not save the exception/i,
    );
  });

  it("renders nothing when closed", () => {
    render(<ExceptionFormModal open={false} onClose={jest.fn()} onSubmit={jest.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
