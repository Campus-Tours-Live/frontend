import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "@/components/ui/breadcrumb/Breadcrumb";
import { BreadcrumbItem } from "@/components/ui/breadcrumb/BreadcrumbItem";

describe("Breadcrumb", () => {
  it("renders a labelled nav with an ordered list of crumbs and separators", () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem href="/tours">Tours</BreadcrumbItem>
        <BreadcrumbItem href="/tours/mit" isCurrent>
          MIT
        </BreadcrumbItem>
      </Breadcrumb>,
    );
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav.querySelector("ol")).toBeInTheDocument();
    // 3 crumbs → 2 separators.
    expect(nav.querySelectorAll("li")).toHaveLength(3);
    expect(screen.getAllByText("/")).toHaveLength(2);
  });

  it("renders non-current items as links and the current item as aria-current text", () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem href="/tours/mit" isCurrent>
          MIT
        </BreadcrumbItem>
      </Breadcrumb>,
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: "MIT" })).not.toBeInTheDocument();
    expect(screen.getByText("MIT")).toHaveAttribute("aria-current", "page");
  });

  it("renders nothing when empty", () => {
    const { container } = render(<Breadcrumb>{null}</Breadcrumb>);
    expect(container).toBeEmptyDOMElement();
  });

  it("accepts a custom accessible label", () => {
    render(
      <Breadcrumb a11yLabel="You are here">
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
      </Breadcrumb>,
    );
    expect(screen.getByRole("navigation", { name: "You are here" })).toBeInTheDocument();
  });
});
