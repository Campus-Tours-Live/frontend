import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FocusTrap } from "@/components/ui/utils/FocusTrap";

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        opener
      </button>
      {open ? (
        <FocusTrap disabled={disabled}>
          <button type="button">first</button>
          <button type="button">last</button>
          <button type="button" onClick={() => setOpen(false)}>
            close
          </button>
        </FocusTrap>
      ) : null}
    </>
  );
}

describe("FocusTrap", () => {
  it("focuses the first focusable child on mount", () => {
    render(<Harness />);
    expect(screen.getByText("first")).toHaveFocus();
  });

  it("does not auto-focus when disabled", () => {
    render(<Harness disabled />);
    expect(screen.getByText("first")).not.toHaveFocus();
  });

  it("wraps Tab from the last element back to the first", () => {
    render(<Harness />);
    const last = screen.getByText("close");
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(screen.getByText("first")).toHaveFocus();
  });

  it("wraps Shift+Tab from the first element to the last", () => {
    render(<Harness />);
    const first = screen.getByText("first");
    first.focus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(screen.getByText("close")).toHaveFocus();
  });

  it("returns focus to the opener when the trap unmounts", async () => {
    const user = userEvent.setup();

    function ReturnHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            opener
          </button>
          {open ? (
            <FocusTrap>
              <button type="button" onClick={() => setOpen(false)}>
                close
              </button>
            </FocusTrap>
          ) : null}
        </>
      );
    }

    render(<ReturnHarness />);
    // Clicking the opener focuses it, then mounts the trap (which captures it as the return target).
    await user.click(screen.getByText("opener"));
    expect(screen.getByText("close")).toHaveFocus();
    // Closing unmounts the trap → focus returns to the opener.
    await user.click(screen.getByText("close"));
    expect(screen.getByText("opener")).toHaveFocus();
  });
});
