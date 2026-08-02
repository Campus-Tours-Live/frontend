import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextField } from "@/components/ui/field/TextField";

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

  /**
   * Field mints `id="<inputId>-description"` for the help text; until something referenced it the
   * description was visual-only. It is the only carrier of the acceptable entry-year window and of
   * the reason class year is disabled, so a screen reader hearing just the label is missing the
   * whole instruction.
   */
  it("gives the input an accessible description from `description`", () => {
    render(<TextField label="Entry year" description="The year you started — 2016 to 2027." />);
    expect(screen.getByLabelText("Entry year")).toHaveAccessibleDescription(
      "The year you started — 2016 to 2027.",
    );
  });

  it("does not set aria-describedby without a description", () => {
    render(<TextField label="Entry year" />);
    expect(screen.getByLabelText("Entry year")).not.toHaveAttribute("aria-describedby");
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
    expect(screen.getByLabelText("Email")).toHaveClass("px-3", "py-2", "text-ui-sm");
  });
});
