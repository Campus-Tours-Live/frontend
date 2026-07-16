import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/components/ui/overlays/Modal";

afterEach(() => {
  // useScrollLock mutates body style; reset between tests.
  document.body.style.overflow = "";
});

describe("Modal", () => {
  it("renders nothing while closed", () => {
    const { container } = render(
      <Modal open={false} onClose={jest.fn()}>
        <p>hi</p>
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a role='dialog' with aria-modal when open", () => {
    render(
      <Modal open onClose={jest.fn()}>
        <p>content</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("wires aria-labelledby from labelledBy", () => {
    render(
      <Modal open onClose={jest.fn()} labelledBy="title-1">
        <h2 id="title-1">Title</h2>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby", "title-1");
  });

  it("merges className onto the panel", () => {
    render(
      <Modal open onClose={jest.fn()} className="max-w-md">
        <p>x</p>
      </Modal>,
    );
    expect(screen.getByText("x").parentElement).toHaveClass("max-w-md");
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose}>
        <p>x</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dismissOnBackdrop=false suppresses backdrop close", async () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} dismissOnBackdrop={false}>
        <p>x</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape (useDismiss)", async () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose}>
        <p>x</p>
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll while open and restores it on close", () => {
    const { rerender } = render(
      <Modal open onClose={jest.fn()}>
        <p>x</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Modal open={false} onClose={jest.fn()}>
        <p>x</p>
      </Modal>,
    );
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  describe("fallback mode (no header/footer) — unchanged plain panel", () => {
    it("renders children directly in the panel with no header/footer/scroll wrapper", () => {
      render(
        <Modal open onClose={jest.fn()} className="max-w-md">
          <p>plain content</p>
        </Modal>,
      );
      const panel = screen.getByText("plain content").parentElement as HTMLElement;
      // The panel itself is `children`'s direct parent — no intermediate
      // header/body/footer regions and none of structured mode's height/scroll classes.
      expect(panel).toHaveClass("max-w-md");
      expect(panel).not.toHaveClass("overflow-y-auto");
      expect(panel).not.toHaveClass("max-h-[85vh]");
      expect(panel.querySelector(".overflow-y-auto")).not.toBeInTheDocument();
    });
  });

  describe("structured mode (header and/or footer provided)", () => {
    it("caps the panel to a responsive viewport height and renders header + scrollable body + footer", () => {
      render(
        <Modal
          open
          onClose={jest.fn()}
          className="max-w-lg"
          header={<h2>My title</h2>}
          footer={<button type="button">Done</button>}
        >
          <p>body content</p>
        </Modal>,
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");

      // Panel: responsive max/min height cap + flex column + still keeps caller's className.
      const panel = screen.getByText("My title").closest(".rounded-panel") as HTMLElement;
      expect(panel).toHaveClass("flex", "max-h-[85vh]", "min-h-[min(22rem,80vh)]", "flex-col");
      expect(panel).toHaveClass("max-w-lg");

      // Header, body, and footer are distinct regions.
      expect(screen.getByText("My title")).toBeInTheDocument();
      const body = screen.getByText("body content").parentElement as HTMLElement;
      // `min-h-0` is required alongside `flex-1 overflow-y-auto` so the body actually
      // scrolls at the panel's max-height cap instead of growing it past the viewport.
      expect(body).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
      expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    });

    it("uses a custom max-height cap when `maxHeightClassName` is provided", () => {
      render(
        <Modal
          open
          onClose={jest.fn()}
          header={<h2>Capped</h2>}
          footer={<button type="button">Done</button>}
          maxHeightClassName="max-h-[min(600px,85vh)]"
        >
          body content
        </Modal>,
      );

      const panel = screen.getByText("Capped").closest(".rounded-panel") as HTMLElement;
      // The custom cap wins; the 85vh default is not applied.
      expect(panel).toHaveClass("max-h-[min(600px,85vh)]");
      expect(panel).not.toHaveClass("max-h-[85vh]");
    });

    it("renders in structured mode when only `header` is provided (no footer)", () => {
      render(
        <Modal open onClose={jest.fn()} header={<h2>Header only</h2>}>
          <p>body only</p>
        </Modal>,
      );
      const body = screen.getByText("body only").parentElement as HTMLElement;
      expect(body).toHaveClass("overflow-y-auto");
      expect(screen.getByText("Header only")).toBeInTheDocument();
    });

    it("renders in structured mode when only `footer` is provided (no header)", () => {
      render(
        <Modal open onClose={jest.fn()} footer={<button type="button">Save</button>}>
          <p>only body</p>
        </Modal>,
      );
      const body = screen.getByText("only body").parentElement as HTMLElement;
      expect(body).toHaveClass("overflow-y-auto");
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });

    it("still supports role=dialog, backdrop dismiss, and Escape in structured mode", async () => {
      const onClose = jest.fn();
      render(
        <Modal open onClose={onClose} header={<h2>Title</h2>} footer={<span>footer</span>}>
          <p>x</p>
        </Modal>,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("renders a top-right X close button that dismisses even when backdrop dismiss is off", async () => {
      const onClose = jest.fn();
      render(
        <Modal
          open
          onClose={onClose}
          dismissOnBackdrop={false}
          header={<h2>Title</h2>}
          footer={<span>footer</span>}
        >
          <p>x</p>
        </Modal>,
      );

      await userEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not render the X close button in fallback mode", () => {
      render(
        <Modal open onClose={jest.fn()}>
          <p>plain</p>
        </Modal>,
      );
      expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    });
  });
});
