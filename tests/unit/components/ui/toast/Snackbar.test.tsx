import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SnackbarProvider } from "@/components/ui/toast/SnackbarProvider";
import { useSnackbar } from "@/components/ui/toast/useSnackbar";
import type { SnackOptions } from "@/components/ui/toast/SnackbarProvider";

function Trigger({ snack }: { snack: SnackOptions }) {
  const { addSnack } = useSnackbar();
  return (
    <button type="button" onClick={() => addSnack(snack)}>
      raise
    </button>
  );
}

function renderWith(snack: SnackOptions) {
  return render(
    <SnackbarProvider>
      <Trigger snack={snack} />
    </SnackbarProvider>,
  );
}

describe("Snackbar", () => {
  it("shows a snack when addSnack is called, in an assertive live region", async () => {
    const user = userEvent.setup();
    renderWith({ message: "Availability saved" });

    expect(screen.queryByText("Availability saved")).not.toBeInTheDocument();
    await user.click(screen.getByText("raise"));

    const message = screen.getByText("Availability saved");
    expect(message).toBeInTheDocument();
    expect(message.closest("[aria-live='assertive']")).not.toBeNull();
  });

  it("fires the action and dismisses when the action button is clicked", async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    renderWith({ message: "Override removed", action: { label: "Undo", onClick: onAction } });

    await user.click(screen.getByText("raise"));
    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Override removed")).not.toBeInTheDocument();
  });

  it("closes on the close button and fires onClose", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderWith({ message: "Saved", onClose });

    await user.click(screen.getByText("raise"));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("auto-dismisses after the duration", async () => {
    jest.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderWith({ message: "Saved", duration: 1000 });

      await user.click(screen.getByText("raise"));
      expect(screen.getByText("Saved")).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
