import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "@/components/ui/icon-button/IconButton";
import { Icon } from "@/components/ui/icon/Icon";

describe("IconButton", () => {
  it("exposes a11yLabel as the button's accessible name", () => {
    render(
      <IconButton a11yLabel="More options">
        <Icon name="more" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "More options" })).toBeInTheDocument();
  });

  it("defaults to type=button and fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <IconButton a11yLabel="Close" onClick={onClick}>
        <Icon name="close" />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Close" });
    expect(btn).toHaveAttribute("type", "button");
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards ref and passes through data-* / id attributes", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <IconButton a11yLabel="Info" ref={ref} id="info-btn" data-dca-id="B:123">
        <Icon name="info" />
      </IconButton>,
    );
    expect(ref.current).toBe(screen.getByRole("button", { name: "Info" }));
    expect(ref.current).toHaveAttribute("id", "info-btn");
    expect(ref.current).toHaveAttribute("data-dca-id", "B:123");
  });

  it("is disabled when `disabled` is set", () => {
    render(
      <IconButton a11yLabel="Edit" disabled>
        <Icon name="edit" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
  });

  it("applies the frosted-glass variant, defaulting to the ivory tone for dark grounds", () => {
    render(
      <IconButton a11yLabel="Save" variant="glass">
        <Icon name="info" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("glass", "glass-light");
  });

  /**
   * The tone belongs to the CALLER, because only the call site knows the ground. It used to be
   * hard-coded to `light` — ivory glass under an ivory glyph — so a control over caller-supplied
   * imagery had no way to stay visible on a pale photo (WCAG 1.4.11 wants ≥3:1 for a UI boundary).
   * `smoke` is the tone that survives BOTH grounds, which is also what iOS uses for controls over
   * photos: a thin dark material carrying a light glyph.
   */
  it("takes the smoke tone for controls over arbitrary imagery", () => {
    render(
      <IconButton a11yLabel="Save" variant="glass" tone="smoke">
        <Icon name="info" />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("glass", "glass-smoke");
    expect(button).not.toHaveClass("glass-light");
  });

  /**
   * A glass control floats over imagery, which offers no affordance of its own — and on the tour
   * card it also overlaps a stretched card link, so without a response of its own, hovering the
   * heart looks exactly like hovering the card behind it and the user cannot tell whether a click
   * will save or navigate. The old response was a 22%→32% tint bump on a translucent material over
   * a photo: technically present, perceptually absent. Scale is the cue that does not depend on
   * whatever colour happens to be behind the button.
   */
  it("gives the glass variant a background-independent hover and press response", () => {
    render(
      <IconButton a11yLabel="Save" variant="glass" tone="smoke">
        <Icon name="info" />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("hover:scale-110", "active:scale-95");
    // Reduced motion must lose the movement itself, not merely its animation.
    expect(button).toHaveClass("motion-reduce:transition-none", "motion-reduce:hover:scale-100");
  });

  it("applies the solid (filled brand) variant", () => {
    render(
      <IconButton a11yLabel="Search" variant="solid">
        <Icon name="info" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Search" })).toHaveClass(
      "bg-primary",
      "text-primary-foreground",
    );
  });

  it("applies the card (bordered surface) variant", () => {
    render(
      <IconButton a11yLabel="Next" variant="card">
        <Icon name="info" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Next" })).toHaveClass(
      "border",
      "bg-card",
      "shadow-card",
    );
  });

  it("renders an anchor when given href, with tab-nabbing-safe rel for target=_blank", () => {
    render(
      <IconButton a11yLabel="Help" href="https://example.com" target="_blank">
        <Icon name="info" />
      </IconButton>,
    );
    const link = screen.getByRole("link", { name: "Help" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("respects an explicit rel on an anchor instead of the tab-nabbing default", () => {
    render(
      <IconButton a11yLabel="Help" href="https://example.com" target="_blank" rel="noopener">
        <Icon name="info" />
      </IconButton>,
    );
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute("rel", "noopener");
  });

  it("leaves rel unset on an anchor without target=_blank", () => {
    render(
      <IconButton a11yLabel="Docs" href="/docs">
        <Icon name="info" />
      </IconButton>,
    );
    expect(screen.getByRole("link", { name: "Docs" })).not.toHaveAttribute("rel");
  });
});
