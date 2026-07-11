import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDeleteModal } from "@/components/availability/ConfirmDeleteModal";

describe("ConfirmDeleteModal", () => {
  it("renders nothing when closed", () => {
    render(
      <ConfirmDeleteModal
        open={false}
        title="Remove recurring hours?"
        description="This removes Monday 9:00 AM · 1h from your weekly schedule."
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the title and description inside the dialog when open", () => {
    render(
      <ConfirmDeleteModal
        open
        title="Remove recurring hours?"
        description="This removes Monday 9:00 AM · 1h from your weekly schedule."
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Remove recurring hours?")).toBeInTheDocument();
    expect(
      within(dialog).getByText("This removes Monday 9:00 AM · 1h from your weekly schedule."),
    ).toBeInTheDocument();
  });

  it("Cancel closes the dialog without calling the delete handler", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onConfirm = jest.fn();

    render(
      <ConfirmDeleteModal
        open
        title="Remove recurring hours?"
        description="desc"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Remove (default confirmLabel) calls the confirm handler", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    render(
      <ConfirmDeleteModal
        open
        title="Remove recurring hours?"
        description="desc"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("uses a custom confirmLabel when provided", () => {
    render(
      <ConfirmDeleteModal
        open
        title="t"
        description="d"
        confirmLabel="Delete forever"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Delete forever" })).toBeInTheDocument();
  });

  it("shows 'Removing…' and disables both buttons while confirming", () => {
    render(
      <ConfirmDeleteModal
        open
        title="t"
        description="d"
        confirming
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Removing…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("renders no error alert when error is unset", () => {
    render(
      <ConfirmDeleteModal
        open
        title="t"
        description="d"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders a delete-failure error INSIDE the dialog, and the dialog stays open", () => {
    render(
      <ConfirmDeleteModal
        open
        title="Remove recurring hours?"
        description="desc"
        error="Could not remove recurring hours. Please try again."
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Could not remove recurring hours. Please try again."),
    ).toBeInTheDocument();
    // Assert via the dialog's own alert role — not a whole-DOM query — proving the error renders
    // inside this dialog rather than as a page-level banner.
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Could not remove recurring hours. Please try again.",
    );
  });
});
