import { render, screen } from "@testing-library/react";
import { ParticipantHistory } from "@/components/dashboard/ParticipantHistory";

describe("ParticipantHistory", () => {
  it("renders the History eyebrow and heading", () => {
    render(<ParticipantHistory />);
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your past tours" })).toBeInTheDocument();
  });

  it("renders the description lead text", () => {
    render(<ParticipantHistory />);
    expect(
      screen.getByText("Review completed tours, recordings when available, and booking history."),
    ).toBeInTheDocument();
  });

  it("renders a 'My Tours' link to /tour-history", () => {
    render(<ParticipantHistory />);
    const link = screen.getByRole("link", { name: "My Tours" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/tour-history");
  });
});
