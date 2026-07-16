import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chip } from "@/components/ui/chip/Chip";

describe("Chip", () => {
  it("renders a button with type='button' by default", () => {
    render(<Chip>Tag</Chip>);
    const btn = screen.getByRole("button", { name: "Tag" });
    expect(btn).toHaveAttribute("type", "button");
    expect(btn).toHaveClass("chip");
  });

  it("inactive: aria-pressed=false and no active class", () => {
    render(<Chip>Tag</Chip>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).not.toHaveClass("active");
  });

  it("active: aria-pressed=true and the active class", () => {
    render(<Chip active>Tag</Chip>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveClass("chip", "active");
  });

  it("applies chip-sm for the sm size", () => {
    render(<Chip size="small">Tag</Chip>);
    expect(screen.getByRole("button")).toHaveClass("chip-sm");
  });

  it("does not apply chip-sm for the md size", () => {
    render(<Chip size="medium">Tag</Chip>);
    expect(screen.getByRole("button")).not.toHaveClass("chip-sm");
  });

  it("fires onClick", async () => {
    const onClick = jest.fn();
    render(<Chip onClick={onClick}>Tag</Chip>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("merges a custom className", () => {
    render(<Chip className="mine">Tag</Chip>);
    expect(screen.getByRole("button")).toHaveClass("chip", "mine");
  });

  it("forwards a ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Chip ref={ref}>Tag</Chip>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
