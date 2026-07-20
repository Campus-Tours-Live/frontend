import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardFooter } from "@/components/ui/wizard-footer/WizardFooter";

describe("WizardFooter", () => {
  it("renders Previous/Continue by default", () => {
    render(<WizardFooter />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("overrides labels and wires onClick / disabled through the button props", async () => {
    const user = userEvent.setup();
    const onNext = jest.fn();
    render(
      <WizardFooter
        previousButtonProps={{ disabled: true }}
        nextButtonProps={{ children: "Finish", onClick: onNext }}
      />,
    );
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    const finish = screen.getByRole("button", { name: "Finish" });
    await user.click(finish);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("locks the variants — the buttons keep primary/secondary styling", () => {
    render(<WizardFooter nextButtonProps={{ children: "Go" }} />);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass("btn-primary");
    expect(screen.getByRole("button", { name: "Previous" })).toHaveClass("btn-secondary");
  });

  it("renders optional content above the buttons", () => {
    render(
      <WizardFooter>
        <span>Step 2 of 4</span>
      </WizardFooter>,
    );
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
  });
});
