import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ExceptionFormModal,
  exceptionFormErrorMessage,
} from "@/components/availability/ExceptionFormModal";
import { ApiError } from "@/lib/data-access";

describe("ExceptionFormModal", () => {
  it("submits an all-day unavailable exception without times", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(<ExceptionFormModal open onClose={jest.fn()} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Add exception" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "UNAVAILABLE_ALL_DAY",
      }),
    );
    expect(screen.queryByLabelText("Start time")).not.toBeInTheDocument();
  });

  it("shows time pickers for range exceptions and submits times", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(<ExceptionFormModal open onClose={jest.fn()} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText("Exception type"), "ADDITIONAL");
    expect(screen.getByLabelText("Start time")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add exception" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ADDITIONAL",
        startLocal: "09:00",
        endLocal: "22:00",
      }),
    );
  });

  it("maps API validation errors via exceptionFormErrorMessage", () => {
    expect(exceptionFormErrorMessage(new ApiError(422, "startLocal must be before endLocal"))).toBe(
      "startLocal must be before endLocal",
    );
    expect(exceptionFormErrorMessage(new ApiError(422))).toMatch(/check your input/i);
    expect(exceptionFormErrorMessage(new Error("network"))).toMatch(/Please try again/i);
  });

  it("wires the dialog accessible name to the title", () => {
    render(<ExceptionFormModal open onClose={jest.fn()} onSubmit={jest.fn()} />);

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby", "exception-modal-title");
  });
});
