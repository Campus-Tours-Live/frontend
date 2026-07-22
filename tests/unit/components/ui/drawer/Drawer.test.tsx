import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Drawer } from "@/components/ui/drawer/Drawer";

afterEach(() => {
  document.body.style.overflow = "";
});

describe("Drawer", () => {
  it("is always mounted (renders the dialog even when closed)", () => {
    render(
      <Drawer open={false} onClose={jest.fn()} ariaLabel="Nav">
        <p>panel</p>
      </Drawer>,
    );
    // Mounted but hidden from the a11y tree while closed (so it isn't announced as a dialog).
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("aria-label", "Nav");
    expect(dialog).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("panel")).toBeInTheDocument();
  });

  it("applies the open translate class when open and closed translate when closed", () => {
    const { rerender } = render(
      <Drawer open onClose={jest.fn()}>
        <p>p</p>
      </Drawer>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("translate-x-0");

    rerender(
      <Drawer open={false} onClose={jest.fn()}>
        <p>p</p>
      </Drawer>,
    );
    // left side default → closed slides to -translate-x-full (and is aria-hidden while closed)
    expect(screen.getByRole("dialog", { hidden: true })).toHaveClass("-translate-x-full");
  });

  it("side='right' positions on the right and uses translate-x-full when closed", () => {
    render(
      <Drawer open={false} onClose={jest.fn()} side="right">
        <p>p</p>
      </Drawer>,
    );
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveClass("right-0", "translate-x-full");
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const onClose = jest.fn();
    render(
      <Drawer open onClose={onClose}>
        <p>p</p>
      </Drawer>,
    );
    // Rendered via a portal to <body>; the backdrop is the aria-hidden overlay.
    const backdrop = document.body.querySelector("[aria-hidden]") as HTMLElement;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape while open (useDismiss)", async () => {
    const onClose = jest.fn();
    render(
      <Drawer open onClose={onClose}>
        <p>p</p>
      </Drawer>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT close on Escape while closed (dismiss disabled)", async () => {
    const onClose = jest.fn();
    render(
      <Drawer open={false} onClose={onClose}>
        <p>p</p>
      </Drawer>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks body scroll while open", () => {
    const { rerender } = render(
      <Drawer open onClose={jest.fn()}>
        <p>p</p>
      </Drawer>,
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Drawer open={false} onClose={jest.fn()}>
        <p>p</p>
      </Drawer>,
    );
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("structured mode renders a fixed header + footer around the scrollable body", () => {
    render(
      <Drawer
        open
        onClose={jest.fn()}
        side="bottom"
        header={<h2>Edit day</h2>}
        footer={<button type="button">Save</button>}
      >
        <p>editor body</p>
      </Drawer>,
    );
    expect(screen.getByRole("heading", { name: "Edit day" })).toBeInTheDocument();
    expect(screen.getByText("editor body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("title convenience builds a header with a close button that labels the dialog and fires onClose", async () => {
    const onClose = jest.fn();
    render(
      <Drawer
        open
        onClose={onClose}
        side="right"
        title="Filters"
        actions={<button type="button">Apply</button>}
      >
        <p>body</p>
      </Drawer>,
    );
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Filters" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Apply" })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("an unstructured bottom sheet (no header/footer/title/actions) scrolls the whole panel", () => {
    render(
      <Drawer open onClose={jest.fn()} side="bottom" ariaLabel="Sheet">
        <p>body</p>
      </Drawer>,
    );
    expect(screen.getByRole("dialog", { name: "Sheet" })).toHaveClass("overflow-y-auto");
  });

  it("structured mode with only a footer (no header/title) renders no header bar", () => {
    render(
      <Drawer
        open
        onClose={jest.fn()}
        ariaLabel="Footer only"
        footer={<button type="button">Save</button>}
      >
        <p>body</p>
      </Drawer>,
    );
    const dialog = screen.getByRole("dialog", { name: "Footer only" });
    expect(dialog.querySelector(".border-b")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("size sets the width for a side drawer", () => {
    render(
      <Drawer open onClose={jest.fn()} side="right" size="large" title="Wide">
        <p>body</p>
      </Drawer>,
    );
    expect(screen.getByRole("dialog", { name: "Wide" })).toHaveClass("w-[560px]");
  });
});
