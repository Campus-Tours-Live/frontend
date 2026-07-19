import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "@/components/ui/field/Textarea";

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

  it("counts a controlled value's length (not the uncontrolled fallback)", () => {
    render(<Textarea label="Bio" maxLength={200} value="hello" onChange={() => {}} />);
    expect(screen.getByText("5 / 200")).toBeInTheDocument();
  });

  it("treats a controlled but nullish value as zero length", () => {
    // `value` is defined (not `undefined`), so this stays controlled, but is `null` — the
    // `value ?? ""` fallback inside the length calc must still count it as 0.
    render(
      <Textarea
        label="Bio"
        maxLength={200}
        value={null as unknown as string}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("0 / 200")).toBeInTheDocument();
  });

  it("shows no counter without maxLength", () => {
    render(<Textarea label="Bio" />);
    expect(screen.queryByText(/\/\s*\d+$/)).not.toBeInTheDocument();
  });
});
