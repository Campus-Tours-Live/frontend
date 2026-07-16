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

  it("renders description above the control and hint below it", () => {
    const { container } = render(
      <Field label="Uni" htmlFor="u" description="Pick your campus" hint="below">
        <input id="u" />
      </Field>,
    );
    const desc = screen.getByText("Pick your campus");
    expect(desc).toHaveClass("field-description");
    const kids = Array.from((container.querySelector(".field") as HTMLElement).children);
    const descIdx = kids.indexOf(desc);
    const inputIdx = kids.findIndex((el) => el.tagName === "INPUT");
    const hintIdx = kids.indexOf(screen.getByText("below"));
    expect(descIdx).toBeLessThan(inputIdx); // description above control
    expect(hintIdx).toBeGreaterThan(inputIdx); // hint below control
  });
});
