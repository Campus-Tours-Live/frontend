import { render, screen } from "@testing-library/react";
import {
  Badge,
  StatusBadge,
  type BadgeVariant,
  type StatusVariant,
} from "@/components/ui/data-display/Badge";

describe("Badge", () => {
  it("defaults to the primary variant", () => {
    render(<Badge>New</Badge>);
    const el = screen.getByText("New");
    expect(el).toHaveClass("badge", "badge-primary");
  });

  it.each([
    ["primary", "badge-primary"],
    ["sage", "badge-sage"],
    ["coral", "badge-coral"],
    ["success", "badge-success"],
    ["warn", "badge-warn"],
    ["verified", "badge-verified"],
  ] as [BadgeVariant, string][])("variant %s applies %s", (variant, expected) => {
    render(<Badge variant={variant}>x</Badge>);
    expect(screen.getByText("x")).toHaveClass("badge", expected);
  });

  it("merges a custom className and forwards props", () => {
    render(
      <Badge className="extra" data-testid="b">
        x
      </Badge>,
    );
    expect(screen.getByTestId("b")).toHaveClass("badge", "extra");
  });
});

describe("StatusBadge", () => {
  it("defaults to the info variant", () => {
    render(<StatusBadge>Live</StatusBadge>);
    expect(screen.getByText("Live")).toHaveClass("status", "status-info");
  });

  it.each([
    ["info", "status-info"],
    ["warning", "status-warning"],
    ["success", "status-success"],
    ["error", "status-error"],
  ] as [StatusVariant, string][])("variant %s applies %s", (variant, expected) => {
    render(<StatusBadge variant={variant}>x</StatusBadge>);
    expect(screen.getByText("x")).toHaveClass("status", expected);
  });
});
