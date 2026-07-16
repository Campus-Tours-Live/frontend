import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedControl } from "@/components/ui";

const OPTIONS = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
] as const;

describe("SegmentedControl", () => {
  it("selects the rightmost option by default when uncontrolled with no defaultValue", () => {
    render(<SegmentedControl aria-label="Pick a side" options={OPTIONS} />);
    expect(screen.getByRole("button", { name: "Right" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Left" })).toHaveAttribute("aria-pressed", "false");
  });

  it("honors an explicit defaultValue when uncontrolled", () => {
    render(<SegmentedControl aria-label="Pick a side" options={OPTIONS} defaultValue="left" />);
    expect(screen.getByRole("button", { name: "Left" })).toHaveAttribute("aria-pressed", "true");
  });

  it("moves selection and fires onChange on click when uncontrolled", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<SegmentedControl aria-label="Pick a side" options={OPTIONS} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Left" }));

    expect(onChange).toHaveBeenCalledWith("left");
    expect(screen.getByRole("button", { name: "Left" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reflects a controlled value and does not self-update", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <SegmentedControl
        aria-label="Pick a side"
        options={OPTIONS}
        value="left"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("button", { name: "Left" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Right" }));

    expect(onChange).toHaveBeenCalledWith("right");
    // Parent owns the value, so with an unchanged prop the selection stays put.
    expect(screen.getByRole("button", { name: "Left" })).toHaveAttribute("aria-pressed", "true");
  });

  it("exposes the group's accessible name", () => {
    render(<SegmentedControl aria-label="Override type" options={OPTIONS} />);
    expect(screen.getByRole("group", { name: "Override type" })).toBeInTheDocument();
  });
});
