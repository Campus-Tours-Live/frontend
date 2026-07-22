import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "@/components/ui/checkbox/Checkbox";

describe("Checkbox", () => {
  it("renders a labelled checkbox reflecting the checked prop", () => {
    render(<Checkbox label="Apple" checked onChange={jest.fn()} />);
    const cb = screen.getByRole("checkbox", { name: "Apple" });
    expect(cb).toBeChecked();
  });

  it("fires onChange when toggled by clicking the label", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Checkbox label="Apple" checked={false} onChange={onChange} />);
    await user.click(screen.getByText("Apple"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("sets the indeterminate DOM state", () => {
    render(<Checkbox label="Select all" indeterminate checked={false} onChange={jest.fn()} />);
    expect(screen.getByRole("checkbox", { name: "Select all" })).toBePartiallyChecked();
  });

  it("disables the input", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Checkbox label="Apple" disabled checked={false} onChange={onChange} />);
    const cb = screen.getByRole("checkbox", { name: "Apple" });
    expect(cb).toBeDisabled();
    await user.click(cb);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("supports an external label via aria-labelledby", () => {
    render(
      <>
        <span id="ext">Terms</span>
        <Checkbox aria-labelledby="ext" checked={false} onChange={jest.fn()} />
      </>,
    );
    expect(screen.getByRole("checkbox", { name: "Terms" })).toBeInTheDocument();
  });

  it("forwards native input props and a ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Checkbox
        ref={ref}
        label="Apple"
        name="fruit"
        value="apple"
        checked={false}
        onChange={jest.fn()}
      />,
    );
    const cb = screen.getByRole("checkbox", { name: "Apple" });
    expect(cb).toHaveAttribute("name", "fruit");
    expect(cb).toHaveAttribute("value", "apple");
    expect(ref.current).toBe(cb);
  });

  it("defaults to unchecked when `checked` is omitted", () => {
    render(<Checkbox label="Apple" onChange={jest.fn()} />);
    expect(screen.getByRole("checkbox", { name: "Apple" })).not.toBeChecked();
  });

  it("accepts a callback ref", () => {
    let node: HTMLInputElement | null = null;
    render(
      <Checkbox
        ref={(el) => {
          node = el;
        }}
        label="Apple"
        checked={false}
        onChange={jest.fn()}
      />,
    );
    expect(node).toBe(screen.getByRole("checkbox", { name: "Apple" }));
  });

  it("uses the disabled+filled box tone when disabled and checked", () => {
    render(<Checkbox label="Apple" disabled checked onChange={jest.fn()} />);
    const cb = screen.getByRole("checkbox", { name: "Apple" });
    const box = cb.parentElement?.querySelector("span[aria-hidden]");
    expect(box).toHaveClass("border-border", "bg-border", "text-white");
  });
});
