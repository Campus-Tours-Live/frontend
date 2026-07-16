import { render, screen } from "@testing-library/react";
import { FormGroup } from "@/components/ui/forms/FormGroup";
import { FormLabel } from "@/components/ui/forms/FormLabel";
import { FormHelperText } from "@/components/ui/forms/FormHelperText";

describe("FormLabel", () => {
  it("renders a label associated via htmlFor", () => {
    render(<FormLabel htmlFor="x">Name</FormLabel>);
    const label = screen.getByText("Name").closest("label");
    expect(label).toHaveAttribute("for", "x");
  });
});

describe("FormHelperText", () => {
  it("is muted with no icon by default", () => {
    const { container } = render(<FormHelperText>Pick one</FormHelperText>);
    expect(screen.getByText("Pick one")).toHaveClass("text-ink-soft");
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("shows the error colour and an alert icon when hasError", () => {
    const { container } = render(<FormHelperText hasError>Required</FormHelperText>);
    expect(screen.getByText("Required")).toHaveClass("text-error");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden");
  });
});

describe("FormGroup", () => {
  it("wraps children in a fieldset with a legend label and helper text", () => {
    const { container } = render(
      <FormGroup label="Notify me" helperText="Pick any">
        <input aria-label="a" type="checkbox" />
        <input aria-label="b" type="checkbox" />
      </FormGroup>,
    );
    expect(container.querySelector("fieldset")).toBeInTheDocument();
    expect(container.querySelector("legend")).toHaveTextContent("Notify me");
    expect(screen.getByText("Pick any")).toBeInTheDocument();
    expect(screen.getByLabelText("a")).toBeInTheDocument();
    expect(screen.getByLabelText("b")).toBeInTheDocument();
  });

  it("prefers error over helperText and flags the error state", () => {
    render(
      <FormGroup label="Fruit" error="Choose at least one" helperText="Pick any">
        <input aria-label="a" type="checkbox" />
      </FormGroup>,
    );
    expect(screen.getByText("Choose at least one")).toHaveClass("text-error");
    expect(screen.queryByText("Pick any")).not.toBeInTheDocument();
  });
});
