import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, buttonClasses } from "@/components/ui/button/Button";

describe("buttonClasses helper", () => {
  it("defaults to primary, md size, no block", () => {
    const cls = buttonClasses();
    expect(cls).toContain("btn");
    expect(cls).toContain("btn-primary");
    // md maps to "" — no size class, no block class
    expect(cls).not.toContain("btn-sm");
    expect(cls).not.toContain("btn-lg");
    expect(cls).not.toContain("btn-block");
  });

  it.each([
    ["primary", "btn-primary"],
    ["secondary", "btn-secondary"],
    ["ghost", "btn-ghost"],
    ["accent", "btn-accent"],
  ] as const)("maps variant %s to %s", (variant, expected) => {
    expect(buttonClasses({ variant })).toContain(expected);
  });

  it.each([
    ["small", "btn-sm"],
    ["large", "btn-lg"],
  ] as const)("maps size %s to %s", (size, expected) => {
    expect(buttonClasses({ size })).toContain(expected);
  });

  it("omits a size class for md", () => {
    const cls = buttonClasses({ size: "medium" });
    expect(cls).not.toMatch(/btn-(sm|lg)/);
  });

  it("adds btn-block when block is true", () => {
    expect(buttonClasses({ block: true })).toContain("btn-block");
  });
});

describe("Button", () => {
  it("renders a <button> with its children", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: "Click me" });
    expect(btn.tagName).toBe("BUTTON");
  });

  it("defaults to type='button'", () => {
    render(<Button>Hi</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("honours an explicit type", () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it.each([
    ["primary", "btn-primary"],
    ["secondary", "btn-secondary"],
    ["ghost", "btn-ghost"],
    ["accent", "btn-accent"],
  ] as const)("variant %s applies %s", (variant, expected) => {
    render(<Button variant={variant}>v</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn", expected);
  });

  it.each([
    ["small", "btn-sm"],
    ["large", "btn-lg"],
  ] as const)("size %s applies %s", (size, expected) => {
    render(<Button size={size}>s</Button>);
    expect(screen.getByRole("button")).toHaveClass(expected);
  });

  it("applies btn-block when block is set", () => {
    render(<Button block>b</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-block");
  });

  it("merges a custom className", () => {
    render(<Button className="custom-x">c</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn", "custom-x");
  });

  it("forwards onClick", async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>go</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards disabled and does not fire onClick", async () => {
    const onClick = jest.fn();
    render(
      <Button disabled onClick={onClick}>
        no
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwards a ref to the underlying button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>r</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  describe("asChild (Slot)", () => {
    it("renders the child element instead of a <button> and applies styles", () => {
      render(
        <Button asChild variant="secondary" size="large" block>
          <a href="/x">link button</a>
        </Button>,
      );
      // No button is rendered.
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      const link = screen.getByRole("link", { name: "link button" });
      expect(link.tagName).toBe("A");
      expect(link).toHaveClass("btn", "btn-secondary", "btn-lg", "btn-block");
      expect(link).toHaveAttribute("href", "/x");
    });

    it("does not inject a type attribute onto the child", () => {
      render(
        <Button asChild>
          <a href="/y">child</a>
        </Button>,
      );
      expect(screen.getByRole("link")).not.toHaveAttribute("type");
    });
  });
});
