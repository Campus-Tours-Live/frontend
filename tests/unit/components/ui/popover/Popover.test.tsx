import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Popover, type PopoverAlign } from "@/components/ui";

/** A tiny harness: an anchor button (captured via a callback ref) plus a Popover. */
function Harness({
  initialOpen = true,
  withClose = false,
  align,
}: {
  initialOpen?: boolean;
  withClose?: boolean;
  align?: PopoverAlign;
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
        align={align}
        aria-label="Test popover"
      >
        <div>popover body</div>
      </Popover>
    </div>
  );
}

/** Mock layout: anchor at left 100–300 (w 200); popover w 80. jsdom has no layout otherwise. */
function mockRects() {
  return jest.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element,
  ) {
    const dialog = this.getAttribute("role") === "dialog";
    const r = dialog
      ? { left: 0, right: 80, top: 0, bottom: 40, width: 80, height: 40 }
      : { left: 100, right: 300, top: 100, bottom: 120, width: 200, height: 20 };
    return { ...r, x: r.left, y: r.top, toJSON: () => ({}) } as DOMRect;
  });
}

/** Mock layout with the anchor pinned near the bottom of the viewport, forcing a flip-up. */
function mockRectsNearBottom() {
  const bottom = window.innerHeight - 10;
  return jest.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element,
  ) {
    const dialog = this.getAttribute("role") === "dialog";
    const r = dialog
      ? { left: 0, right: 80, top: 0, bottom: 40, width: 80, height: 40 }
      : { left: 100, right: 300, top: bottom - 20, bottom, width: 200, height: 20 };
    return { ...r, x: r.left, y: r.top, toJSON: () => ({}) } as DOMRect;
  });
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

  it("aligns left edges to the anchor by default (align='start')", () => {
    const spy = mockRects();
    try {
      render(<Harness />);
      expect(screen.getByRole("dialog")).toHaveStyle({ left: "100px" });
    } finally {
      spy.mockRestore();
    }
  });

  it("aligns right edges to the anchor when align='end'", () => {
    const spy = mockRects();
    try {
      render(<Harness align="end" />);
      // right edge (300) − width (80) = 220
      expect(screen.getByRole("dialog")).toHaveStyle({ left: "220px" });
    } finally {
      spy.mockRestore();
    }
  });

  it("centres on the anchor when align='center'", () => {
    const spy = mockRects();
    try {
      render(<Harness align="center" />);
      // anchor centre (200) − half width (40) = 160
      expect(screen.getByRole("dialog")).toHaveStyle({ left: "160px" });
    } finally {
      spy.mockRestore();
    }
  });

  it("flips above the anchor when there isn't room below but there is above", () => {
    const spy = mockRectsNearBottom();
    try {
      render(<Harness />);
      const anchorBottom = window.innerHeight - 10;
      const anchorTop = anchorBottom - 20;
      // Flipped up: top = anchor.top − popover.height(40) − GAP(6), not anchor.bottom + GAP.
      const expectedTop = anchorTop - 40 - 6;
      expect(screen.getByRole("dialog")).toHaveStyle({ top: `${expectedTop}px` });
    } finally {
      spy.mockRestore();
    }
  });

  it("does not dismiss when clicking inside the popover", async () => {
    const user = userEvent.setup();
    render(<Harness withClose />);
    expect(screen.getByText("popover body")).toBeInTheDocument();
    await user.click(screen.getByText("popover body"));
    expect(screen.getByText("popover body")).toBeInTheDocument();
  });

  it("does not dismiss when clicking the anchor itself", async () => {
    const user = userEvent.setup();
    render(<Harness withClose />);
    expect(screen.getByText("popover body")).toBeInTheDocument();
    await user.click(screen.getByText("anchor"));
    expect(screen.getByText("popover body")).toBeInTheDocument();
  });

  it("repositions on an ancestor scroll and on window resize while open", () => {
    const spy = mockRects();
    try {
      render(<Harness />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveStyle({ left: "100px" });
      // Neither listener throws, and the popover stays pinned/visible after each trigger.
      act(() => {
        fireEvent.scroll(window);
      });
      expect(dialog).toBeInTheDocument();
      act(() => {
        fireEvent(window, new Event("resize"));
      });
      expect(dialog).toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });
});
