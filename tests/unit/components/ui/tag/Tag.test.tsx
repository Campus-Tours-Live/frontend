import { render, screen } from "@testing-library/react";
import { Tag } from "@/components/ui/tag/Tag";

describe("Tag", () => {
  it("renders its children with the default blue/secondary styling (theme tokens)", () => {
    render(<Tag>Available</Tag>);
    const el = screen.getByText("Available");
    expect(el).toHaveClass("bg-primary-soft", "text-primary-dark", "rounded-pill");
  });

  it("applies the color × variant class map using theme tokens", () => {
    render(
      <Tag color="green" variant="primary">
        Confirmed
      </Tag>,
    );
    expect(screen.getByText("Confirmed")).toHaveClass("bg-success", "text-success-foreground");
  });

  it("supports the brand coral / sage colours (theme tokens)", () => {
    const { rerender } = render(
      <Tag color="coral" variant="secondary">
        Campus life
      </Tag>,
    );
    expect(screen.getByText("Campus life")).toHaveClass("bg-coral-soft", "text-coral-foreground");
    rerender(
      <Tag color="sage" variant="secondary">
        International
      </Tag>,
    );
    expect(screen.getByText("International")).toHaveClass("bg-sage-soft", "text-sage-foreground");
  });

  it("inverse variant fills with the deep colour and light text", () => {
    render(
      <Tag color="coral" variant="inverse">
        Campus life
      </Tag>,
    );
    expect(screen.getByText("Campus life")).toHaveClass("bg-coral-foreground", "text-ivory");
  });

  it("renders leading content before the children", () => {
    render(<Tag leading={<svg data-testid="icon" />}>Rated</Tag>);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Rated")).toBeInTheDocument();
  });

  it("merges a custom className", () => {
    render(<Tag className="mine">X</Tag>);
    expect(screen.getByText("X")).toHaveClass("mine");
  });
});
