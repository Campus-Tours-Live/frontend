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
