import { render, screen } from "@testing-library/react";
import { GuideEarningsPage } from "@/components/earnings/GuideEarningsPage";

describe("GuideEarningsPage", () => {
  it("renders the earnings workspace summary and empty state", () => {
    render(<GuideEarningsPage />);

    expect(screen.getByRole("heading", { name: "Earnings" })).toBeInTheDocument();
    expect(screen.getByText("Available balance")).toBeInTheDocument();
    expect(screen.getByText("Pending earnings")).toBeInTheDocument();
    expect(screen.getByText("Lifetime earnings")).toBeInTheDocument();
    expect(screen.getByText("Completed tours")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No earnings yet" })).toBeInTheDocument();
  });

  it("links guides to the setup steps needed before earning", () => {
    render(<GuideEarningsPage />);

    expect(screen.getByRole("link", { name: "Manage offerings" })).toHaveAttribute(
      "href",
      "/guide/tour-offerings",
    );
    expect(screen.getByRole("link", { name: "Create tour offering" })).toHaveAttribute(
      "href",
      "/guide/tour-offerings/new",
    );
    expect(screen.getByRole("link", { name: "Set availability" })).toHaveAttribute(
      "href",
      "/guide/availability",
    );
  });
});
