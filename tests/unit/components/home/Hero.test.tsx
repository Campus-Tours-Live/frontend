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

  it("renders the two CTAs — 'Explore tours' → /tours, 'Become a guide' → /signup/guide", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: /explore tours/i })).toHaveAttribute("href", "/tours");
    expect(screen.getByRole("link", { name: /become a guide/i })).toHaveAttribute(
      "href",
      "/signup/guide",
    );
  });

  it("lists all three trust signals", () => {
    render(<Hero />);
    expect(screen.getByText(/verified current students/i)).toBeInTheDocument();
    expect(screen.getByText(/secure payment authorization/i)).toBeInTheDocument();
    expect(screen.getByText(/recorded for safety/i)).toBeInTheDocument();
  });
});
