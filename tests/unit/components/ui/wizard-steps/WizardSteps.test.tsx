import { render, screen } from "@testing-library/react";
import { WizardSteps } from "@/components/ui/wizard-steps/WizardSteps";

const STEPS = ["About you", "Your guiding", "Verification"] as const;

describe("WizardSteps", () => {
  it("labels every step and marks the current one", () => {
    render(<WizardSteps steps={STEPS} current={0} />);
    expect(screen.getByText("Step 1 · About you")).toBeInTheDocument();
    expect(screen.getByText("Step 2 · Your guiding")).toBeInTheDocument();
    expect(screen.getByText("Step 3 · Verification")).toBeInTheDocument();
    // The active step's label carries aria-current="step".
    expect(screen.getByText("Step 1 · About you")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Step 2 · Your guiding")).not.toHaveAttribute("aria-current");
  });

  it("marks completed steps (before current) with a check icon, but not the current or upcoming ones", () => {
    const { container } = render(<WizardSteps steps={STEPS} current={2} />);
    // Two steps are behind the current one → two check icons; the current + any upcoming carry none.
    expect(container.querySelectorAll("svg")).toHaveLength(2);
    const completed = screen.getByText("Step 1 · About you");
    expect(completed.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("Step 3 · Verification").querySelector("svg")).toBeNull();
  });

  it("exposes an aria-label for the current position", () => {
    render(<WizardSteps steps={STEPS} current={1} />);
    expect(screen.getByText("Step 2 · Your guiding")).toHaveAttribute("aria-current", "step");
    expect(document.querySelector('[aria-label="Step 2 of 3"]')).toBeInTheDocument();
  });

  it("fills completed bars fully, the current bar partway, and leaves upcoming bars empty", () => {
    const { container } = render(<WizardSteps steps={STEPS} current={1} />);
    const tracks = container.querySelectorAll(".flex.items-center.gap-2 > span");
    expect(tracks).toHaveLength(3);
    // Completed step (0) → full primary fill.
    expect(tracks[0].querySelector("span")).toHaveClass("bg-primary", "w-full");
    // Current step (1) → partial primary fill ("in progress").
    expect(tracks[1].querySelector("span")).toHaveClass("bg-primary", "w-1/2");
    // Upcoming step (2) → fill is always present (so width can animate) but zero-width.
    expect(tracks[2].querySelector("span")).toHaveClass("bg-primary", "w-0");
  });

  it("merges a custom className onto the wrapper", () => {
    const { container } = render(<WizardSteps steps={STEPS} current={0} className="mb-6" />);
    expect(container.firstChild).toHaveClass("mb-6");
  });
});
