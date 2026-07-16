import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { SelectField } from "@/components/ui/field/SelectField";

describe("SelectField", () => {
  it("auto-associates label and select via a generated id", () => {
    render(
      <SelectField label="Topic">
        <option value="a">A</option>
      </SelectField>,
    );
    const select = screen.getByLabelText("Topic");
    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveClass("input");
  });

  it("sets aria-invalid and renders the error", () => {
    render(
      <SelectField label="Topic" error="Required">
        <option value="">Pick one</option>
      </SelectField>,
    );
    expect(screen.getByLabelText("Topic")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("forwards a ref to the select element", () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <SelectField label="Duration" ref={ref}>
        <option value="60">60 minutes</option>
      </SelectField>,
    );
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it("applies the small size and a leading icon", () => {
    render(
      <SelectField label="Topic" size="small" leadingIcon={<svg data-testid="lead" />}>
        <option value="a">A</option>
      </SelectField>,
    );
    expect(screen.getByTestId("lead")).toBeInTheDocument();
    const select = screen.getByLabelText("Topic");
    expect(select).toHaveClass("px-3", "py-2", "text-[13px]", "pl-10");
  });
});
