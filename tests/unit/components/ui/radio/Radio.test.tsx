import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Radio } from "@/components/ui/radio/Radio";

describe("Radio", () => {
  it("renders a labelled radio reflecting the checked prop", () => {
    render(<Radio name="plan" value="mo" label="Monthly" checked onChange={jest.fn()} />);
    const radio = screen.getByRole("radio", { name: "Monthly" });
    expect(radio).toBeChecked();
    expect(radio).toHaveAttribute("name", "plan");
    expect(radio).toHaveAttribute("value", "mo");
  });

  it("fires onChange when an unchecked radio is selected", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Radio name="plan" value="yr" label="Yearly" checked={false} onChange={onChange} />);
    await user.click(screen.getByText("Yearly"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("only one radio in a shared name group is checked", () => {
    render(
      <>
        <Radio name="plan" value="a" label="A" checked onChange={jest.fn()} />
        <Radio name="plan" value="b" label="B" checked={false} onChange={jest.fn()} />
      </>,
    );
    expect(screen.getByRole("radio", { name: "A" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "B" })).not.toBeChecked();
  });

  it("disables the input and blocks selection", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Radio name="p" value="x" label="X" disabled checked={false} onChange={onChange} />);
    const radio = screen.getByRole("radio", { name: "X" });
    expect(radio).toBeDisabled();
    await user.click(radio);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("supports an external label via aria-labelledby and forwards a ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <>
        <span id="ext">Terms</span>
        <Radio ref={ref} name="t" aria-labelledby="ext" checked={false} onChange={jest.fn()} />
      </>,
    );
    const radio = screen.getByRole("radio", { name: "Terms" });
    expect(radio).toBeInTheDocument();
    expect(ref.current).toBe(radio);
  });

  it("defaults to unchecked when `checked` is omitted", () => {
    render(<Radio name="plan" value="mo" label="Monthly" onChange={jest.fn()} />);
    expect(screen.getByRole("radio", { name: "Monthly" })).not.toBeChecked();
  });

  it("dims the filled dot when disabled and checked", () => {
    render(<Radio name="p" value="x" label="X" disabled checked onChange={jest.fn()} />);
    const radio = screen.getByRole("radio", { name: "X" });
    const dot = radio.parentElement?.querySelector("span[aria-hidden] > span");
    expect(dot).toHaveClass("bg-border");
  });
});
