import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field, TextField, Textarea, SelectField } from "@/components/ui/inputs/Field";

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

describe("TextField", () => {
  it("auto-associates label and input via a generated id", () => {
    render(<TextField label="Email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("id");
    expect(input).toHaveClass("input");
  });

  it("uses an explicit id when provided", () => {
    render(<TextField label="Email" id="email-1" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "email-1");
  });

  it("sets aria-invalid and renders the error when error is present", () => {
    render(<TextField label="Email" error="Bad email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Bad email");
  });

  it("does not set aria-invalid without an error", () => {
    render(<TextField label="Email" />);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("forwards arbitrary input props (placeholder, required) and accepts typing", async () => {
    render(<TextField label="Email" placeholder="you@x.com" required />);
    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input).toHaveAttribute("placeholder", "you@x.com");
    expect(input).toBeRequired();
    await userEvent.type(input, "hi");
    expect(input.value).toBe("hi");
  });

  it("merges className onto the input (not the field)", () => {
    render(<TextField label="Email" className="control-x" fieldClassName="field-x" />);
    expect(screen.getByLabelText("Email")).toHaveClass("input", "control-x");
  });

  it("forwards a ref to the input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextField label="Email" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("renders a leading icon and pads the input for it", () => {
    render(<TextField label="Search" leadingIcon={<svg data-testid="lead" />} />);
    expect(screen.getByTestId("lead")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toHaveClass("pl-10");
  });

  it("renders trailing content and pads the input for it", () => {
    render(<TextField label="Name" trailing={<button type="button">Clear</button>} />);
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveClass("pr-10");
  });

  it("applies the small size classes", () => {
    render(<TextField label="Email" size="small" />);
    expect(screen.getByLabelText("Email")).toHaveClass("px-3", "py-2", "text-[13px]");
  });
});

describe("Textarea", () => {
  it("auto-associates label and textarea", () => {
    render(<Textarea label="Bio" />);
    const ta = screen.getByLabelText("Bio");
    expect(ta.tagName).toBe("TEXTAREA");
    expect(ta).toHaveClass("input");
  });

  it("sets aria-invalid and renders the error", () => {
    render(<Textarea label="Bio" error="Too short" />);
    expect(screen.getByLabelText("Bio")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Too short");
  });

  it("forwards a ref to the textarea element", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea label="Bio" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("shows a character counter when maxLength is set and updates it as you type", async () => {
    render(<Textarea label="Bio" maxLength={200} />);
    expect(screen.getByText("0 / 200")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Bio"), "hello");
    expect(screen.getByText("5 / 200")).toBeInTheDocument();
  });

  it("shows no counter without maxLength", () => {
    render(<Textarea label="Bio" />);
    expect(screen.queryByText(/\/\s*\d+$/)).not.toBeInTheDocument();
  });
});

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
