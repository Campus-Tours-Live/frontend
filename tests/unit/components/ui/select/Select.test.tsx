import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "@/components/ui/select/Select";

const OPTIONS = (
  <>
    <option value="ca">California</option>
    <option value="or">Oregon</option>
  </>
);

describe("Select", () => {
  it("labels the native select and renders its options", () => {
    render(
      <Select label="State" value="ca" onChange={() => {}}>
        {OPTIONS}
      </Select>,
    );
    const select = screen.getByLabelText("State");
    expect(select.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "California" })).toBeInTheDocument();
  });

  it("fires onChange when another option is chosen", async () => {
    const onChange = jest.fn();
    render(
      <Select label="State" value="ca" onChange={onChange}>
        {OPTIONS}
      </Select>,
    );
    await userEvent.selectOptions(screen.getByLabelText("State"), "or");
    expect(onChange).toHaveBeenCalled();
  });

  it("shows helperText and wires aria-describedby to it", () => {
    render(
      <Select label="State" helperText="Pick one" value="ca" onChange={() => {}}>
        {OPTIONS}
      </Select>,
    );
    const describedby = screen.getByLabelText("State").getAttribute("aria-describedby");
    expect(describedby).toBeTruthy();
    expect(document.getElementById(describedby!)).toHaveTextContent("Pick one");
  });

  it("error overrides helperText and marks the select invalid", () => {
    render(
      <Select label="State" helperText="Pick one" error="Required" value="ca" onChange={() => {}}>
        {OPTIONS}
      </Select>,
    );
    const select = screen.getByLabelText("State");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Pick one")).not.toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders a leading icon", () => {
    render(
      <Select label="State" leadingIcon={<svg data-testid="lead" />} value="ca" onChange={() => {}}>
        {OPTIONS}
      </Select>,
    );
    expect(screen.getByTestId("lead")).toBeInTheDocument();
  });

  it("disables the select", () => {
    render(
      <Select label="State" disabled value="ca" onChange={() => {}}>
        {OPTIONS}
      </Select>,
    );
    expect(screen.getByLabelText("State")).toBeDisabled();
  });

  it("spreads selectProps onto the select element", () => {
    render(
      <Select label="State" value="ca" onChange={() => {}} selectProps={{ name: "state" }}>
        {OPTIONS}
      </Select>,
    );
    expect(screen.getByLabelText("State")).toHaveAttribute("name", "state");
  });

  it("keeps room for the caret at small size (pr-10 wins over the small px)", () => {
    render(
      <Select label="State" size="small" value="ca" onChange={() => {}}>
        {OPTIONS}
      </Select>,
    );
    // small tightens padding, but the trailing caret's room must survive the merge.
    expect(screen.getByLabelText("State")).toHaveClass("px-3", "py-2", "text-ui-sm", "pr-10");
  });

  it("merges a caller className from selectProps onto the select", () => {
    render(
      <Select label="State" value="ca" onChange={() => {}} selectProps={{ className: "custom-x" }}>
        {OPTIONS}
      </Select>,
    );
    expect(screen.getByLabelText("State")).toHaveClass("input", "custom-x");
  });

  it("forwards a ref to the select element", () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <Select ref={ref} label="State" value="ca" onChange={() => {}}>
        {OPTIONS}
      </Select>,
    );
    expect(ref.current?.tagName).toBe("SELECT");
  });
});
