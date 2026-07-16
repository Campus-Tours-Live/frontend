import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "@/components/ui/Switch";

describe("Switch", () => {
  it("renders a role='switch' with aria-checked=false when unchecked", () => {
    render(<Switch checked={false} onChange={jest.fn()} label="Notifications" />);
    const el = screen.getByRole("switch", { name: "Notifications" });
    expect(el).toHaveAttribute("aria-checked", "false");
    expect(el).toHaveClass("switch");
    expect(el).not.toHaveClass("switch-checked");
  });

  it("renders aria-checked=true and the checked class when checked", () => {
    render(<Switch checked onChange={jest.fn()} label="Notifications" />);
    const el = screen.getByRole("switch", { name: "Notifications" });
    expect(el).toHaveAttribute("aria-checked", "true");
    expect(el).toHaveClass("switch", "switch-checked");
  });

  it("clicking calls onChange with the negation of checked", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Switch checked={false} onChange={onChange} label="Notifications" />);
    await user.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("clicking a checked toggle calls onChange with false", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Switch checked onChange={onChange} label="Notifications" />);
    await user.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("Space toggles the switch", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Switch checked={false} onChange={onChange} label="Notifications" />);
    screen.getByRole("switch").focus();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("Enter toggles the switch", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Switch checked={false} onChange={onChange} label="Notifications" />);
    screen.getByRole("switch").focus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("disabled blocks onChange and dims the control", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Switch checked={false} onChange={onChange} disabled label="Notifications" />);
    const el = screen.getByRole("switch");
    expect(el).toBeDisabled();
    await user.click(el);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("associates via aria-labelledby instead of aria-label when provided", () => {
    render(
      <>
        <span id="ext-label">External label</span>
        <Switch checked={false} onChange={jest.fn()} aria-labelledby="ext-label" />
      </>,
    );
    const el = screen.getByRole("switch", { name: "External label" });
    expect(el).not.toHaveAttribute("aria-label");
    expect(el).toHaveAttribute("aria-labelledby", "ext-label");
  });

  it("merges a custom className and forwards a ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Switch ref={ref} checked={false} onChange={jest.fn()} label="x" className="mine" />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toHaveClass("switch", "mine");
  });
});
