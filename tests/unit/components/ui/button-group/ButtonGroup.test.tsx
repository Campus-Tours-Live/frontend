import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ButtonGroup } from "@/components/ui";

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
] as const;

describe("ButtonGroup", () => {
  it("marks the selected option as pressed", () => {
    render(<ButtonGroup aria-label="Pick one" options={OPTIONS} value="a" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Beta" })).toHaveAttribute("aria-pressed", "false");
  });

  it("fires onChange with the clicked option's value", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ButtonGroup aria-label="Pick one" options={OPTIONS} value="a" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Beta" }));

    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("exposes the group's accessible name", () => {
    render(<ButtonGroup aria-label="Pick one" options={OPTIONS} value="a" onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Pick one" })).toBeInTheDocument();
  });

  it("applies the small size's compact padding/text classes", () => {
    render(
      <ButtonGroup
        aria-label="Pick one"
        options={OPTIONS}
        value="a"
        onChange={() => {}}
        size="small"
      />,
    );
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveClass("px-3", "py-1.5", "text-xs");
  });
});
