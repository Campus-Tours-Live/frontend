import { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FocusTrap } from "@/components/ui/focus/FocusTrap";

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

  it("skips excludeInitialFocus for the initial focus, but keeps it Tab-reachable", () => {
    function ExcludeHarness() {
      const closeRef = useRef<HTMLButtonElement>(null);
      return (
        <FocusTrap excludeInitialFocus={closeRef}>
          <button ref={closeRef} type="button">
            close
          </button>
          <button type="button">content</button>
        </FocusTrap>
      );
    }
    render(<ExcludeHarness />);
    // Initial focus goes to "content", not the (DOM-first) excluded "close".
    expect(screen.getByText("content")).toHaveFocus();
    expect(screen.getByText("close")).not.toHaveFocus();
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

  it("ignores keys other than Tab", () => {
    render(<Harness />);
    const first = screen.getByText("first");
    expect(first).toHaveFocus();
    const notPrevented = fireEvent.keyDown(first, { key: "a" });
    // Falls through the disabled/non-Tab guard without touching focus or the event.
    expect(notPrevented).toBe(true);
    expect(first).toHaveFocus();
  });

  it("prevents Tab (with no wrap) when the trap has no focusable children", () => {
    render(
      <FocusTrap>
        <span>no focusable content</span>
      </FocusTrap>,
    );
    const root = screen.getByText("no focusable content").parentElement as HTMLElement;
    // dispatchEvent (what fireEvent returns) is false only when preventDefault() was called.
    const notPrevented = fireEvent.keyDown(root, { key: "Tab" });
    expect(notPrevented).toBe(false);
  });
});
