import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Popover } from "@/components/ui";

/** A tiny harness: an anchor button (captured via a callback ref) plus a Popover. */
function Harness({
  initialOpen = true,
  withClose = false,
}: {
  initialOpen?: boolean;
  withClose?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <div>
      <button ref={setAnchor}>anchor</button>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={withClose ? () => setOpen(false) : undefined}
        aria-label="Test popover"
      >
        <div>popover body</div>
      </Popover>
    </div>
  );
}

describe("Popover", () => {
  it("renders its children when open and anchored", () => {
    render(<Harness />);
    expect(screen.getByText("popover body")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /test popover/i })).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(<Harness initialOpen={false} />);
    expect(screen.queryByText("popover body")).not.toBeInTheDocument();
  });

  it("renders nothing when there is no anchor element", () => {
    render(
      <Popover open anchorEl={null} aria-label="No anchor">
        <div>should not show</div>
      </Popover>,
    );
    expect(screen.queryByText("should not show")).not.toBeInTheDocument();
  });

  it("dismisses on Escape when onClose is provided", async () => {
    const user = userEvent.setup();
    render(<Harness withClose />);
    expect(screen.getByText("popover body")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("popover body")).not.toBeInTheDocument();
  });

  it("dismisses on an outside pointer press when onClose is provided", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Harness withClose />
        <button>outside</button>
      </div>,
    );
    expect(screen.getByText("popover body")).toBeInTheDocument();
    await user.click(screen.getByText("outside"));
    expect(screen.queryByText("popover body")).not.toBeInTheDocument();
  });
});
