import { render, screen } from "@testing-library/react";
import { RoleCard } from "@/components/signup/RoleCard";

describe("RoleCard", () => {
  const baseProps = {
    image: "/assets/participant.png",
    imageAlt: "Participant illustration",
    badge: "Participant",
    badgeVariant: "info" as const,
    title: "Explore and book live campus tours",
    subtitle: "For prospective students.",
    points: ["Prospective students", "Parents and guardians"],
    cta: "Continue as participant",
    ctaVariant: "primary" as const,
  };

  it("renders the badge, title, points and CTA", () => {
    render(<RoleCard {...baseProps} />);
    expect(screen.getByText("Participant")).toHaveClass("status", "status-info");
    expect(
      screen.getByRole("heading", { name: /explore and book live campus tours/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Prospective students")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue as participant/i })).toBeInTheDocument();
  });

  it("renders the illustration with alt text", () => {
    render(<RoleCard {...baseProps} />);
    expect(screen.getByAltText(/participant illustration/i)).toBeInTheDocument();
  });
});
