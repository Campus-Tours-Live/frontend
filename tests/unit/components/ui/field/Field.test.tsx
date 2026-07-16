import { render, screen } from "@testing-library/react";
import { Field } from "@/components/ui/field/Field";

describe("Field", () => {
  it("renders a label associated with htmlFor", () => {
    render(
      <Field label="Name" htmlFor="name-x">
        <input id="name-x" />
      </Field>,
    );
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("id", "name-x");
  });

  it("renders no label element when label omitted", () => {
    const { container } = render(
      <Field>
        <input aria-label="bare" />
      </Field>,
    );
    expect(container.querySelector("label")).not.toBeInTheDocument();
  });

  it("appends an (optional) suffix when optional", () => {
    render(
      <Field label="Nickname" optional htmlFor="n">
        <input id="n" />
      </Field>,
    );
    expect(screen.getByText(/\(optional\)/)).toBeInTheDocument();
  });

  it("renders the error with role='alert' and prefers it over hint", () => {
    render(
      <Field label="Name" htmlFor="n" error="Required" hint="Your full name">
        <input id="n" />
      </Field>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.queryByText("Your full name")).not.toBeInTheDocument();
  });

  it("renders the hint when there is no error", () => {
    render(
      <Field label="Name" htmlFor="n" hint="Your full name">
        <input id="n" />
      </Field>,
    );
    expect(screen.getByText("Your full name")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("merges a custom className onto the field wrapper", () => {
    const { container } = render(
      <Field className="extra">
        <input aria-label="x" />
      </Field>,
    );
    expect(container.firstChild).toHaveClass("field", "extra");
  });
});
