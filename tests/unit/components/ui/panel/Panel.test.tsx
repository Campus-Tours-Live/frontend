import { render, screen } from "@testing-library/react";
import { Panel, PanelHeader } from "@/components/ui/panel/Panel";

describe("Panel", () => {
  it("renders header above a divider above children, inset by default", () => {
    const { container } = render(
      <Panel header={<div>Header</div>} role="region" aria-label="Weekly hours">
        <div>Body</div>
      </Panel>,
    );
    const region = screen.getByRole("region", { name: "Weekly hours" });
    expect(region).toHaveClass("card");
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    const divider = container.querySelector("[aria-hidden]");
    expect(divider).toHaveClass("mx-5", "sm:mx-6");
  });

  it("draws an edge-to-edge divider when divider='full'", () => {
    const { container } = render(
      <Panel header={<div>Header</div>} divider="full">
        <div>Body</div>
      </Panel>,
    );
    const divider = container.querySelector("[aria-hidden]");
    expect(divider).not.toHaveClass("mx-5");
    expect(divider).not.toHaveClass("sm:mx-6");
  });

  it("merges a custom className and omits role/aria-label when not given", () => {
    const { container } = render(
      <Panel header={<div>Header</div>} className="lg:flex">
        <div>Body</div>
      </Panel>,
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("card", "lg:flex");
    expect(card).not.toHaveAttribute("role");
    expect(card).not.toHaveAttribute("aria-label");
  });
});

describe("PanelHeader", () => {
  it("renders the title, subtitle, and a top-right action", () => {
    render(
      <PanelHeader
        title="Weekly hours"
        subtitle="Set your recurring availability"
        action={<button type="button">Edit</button>}
      >
        <p>Inline notice</p>
      </PanelHeader>,
    );
    expect(screen.getByRole("heading", { name: "Weekly hours" })).toBeInTheDocument();
    expect(screen.getByText("Set your recurring availability")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByText("Inline notice")).toBeInTheDocument();
  });

  it("omits the subtitle and action when neither is given", () => {
    render(<PanelHeader title="Bookable days" />);
    expect(screen.getByRole("heading", { name: "Bookable days" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
