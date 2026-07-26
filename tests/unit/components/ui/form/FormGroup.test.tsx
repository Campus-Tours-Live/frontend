import { render, screen } from "@testing-library/react";
import { FormGroup } from "@/components/ui/form/FormGroup";
import { FormLabel } from "@/components/ui/form/FormLabel";
import { FormHelperText } from "@/components/ui/form/FormHelperText";

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
    expect(screen.getByText("Required")).toHaveClass("text-error-foreground");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden");
  });

  it("dims the text when disabled", () => {
    render(<FormHelperText disabled>Pick one</FormHelperText>);
    expect(screen.getByText("Pick one")).toHaveClass("opacity-60");
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
    expect(screen.getByText("Choose at least one")).toHaveClass("text-error-foreground");
    expect(screen.queryByText("Pick any")).not.toBeInTheDocument();
  });

  it("renders no legend at all when neither label nor helper is given", () => {
    const { container } = render(
      <FormGroup>
        <input aria-label="a" type="checkbox" />
      </FormGroup>,
    );
    expect(container.querySelector("legend")).not.toBeInTheDocument();
  });

  it("renders a legend with only helper text when label is omitted", () => {
    const { container } = render(
      <FormGroup helperText="Pick any">
        <input aria-label="a" type="checkbox" />
      </FormGroup>,
    );
    const legend = container.querySelector("legend");
    expect(legend).toBeInTheDocument();
    // No label rendered inside the legend — just the helper text.
    expect(legend?.textContent).toBe("Pick any");
  });

  it("renders a legend with only the label when helper/error is omitted", () => {
    const { container } = render(
      <FormGroup label="Notify me">
        <input aria-label="a" type="checkbox" />
      </FormGroup>,
    );
    expect(container.querySelector("legend")).toHaveTextContent("Notify me");
    // No FormHelperText rendered.
    expect(container.querySelector("legend svg")).not.toBeInTheDocument();
  });
});
