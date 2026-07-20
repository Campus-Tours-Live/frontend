import { render, screen } from "@testing-library/react";
import { Hero } from "@/components/home/Hero";

describe("Hero", () => {
  it("renders the headline and lead copy", () => {
    render(<Hero />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /explore campus with someone who actually studies there/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ask the questions you cannot find/i)).toBeInTheDocument();
  });

  it("renders both call-to-action buttons", () => {
    render(<Hero />);
    expect(screen.getByRole("button", { name: /explore live tours/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /become a guide/i })).toBeInTheDocument();
  });

  it("lists all three trust signals", () => {
    render(<Hero />);
    expect(screen.getByText(/verified current students/i)).toBeInTheDocument();
    expect(screen.getByText(/secure payment authorization/i)).toBeInTheDocument();
    expect(screen.getByText(/recorded for safety/i)).toBeInTheDocument();
  });
});
