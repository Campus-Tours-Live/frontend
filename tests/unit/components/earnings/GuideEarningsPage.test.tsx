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

  it("shows payout setup guidance and the earnings onboarding steps", () => {
    render(<GuideEarningsPage />);

    expect(
      screen.getByText(/Track tour revenue, payout readiness, and completed booking activity/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Payout setup" })).toBeInTheDocument();
    expect(screen.getByText(/Payout account connection is not enabled/i)).toBeInTheDocument();
    expect(screen.getByText("To start earning")).toBeInTheDocument();
    expect(screen.getByText(/Publish at least one tour offering/i)).toBeInTheDocument();
  });

  it("marks recent earnings as coming soon with zero-value summary cards", () => {
    render(<GuideEarningsPage />);

    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent earnings" })).toBeInTheDocument();
    expect(screen.getAllByText("$0.00").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Ready for payout")).toBeInTheDocument();
    expect(screen.getByText("From tours awaiting completion")).toBeInTheDocument();
    expect(screen.getByText("Total paid bookings")).toBeInTheDocument();
  });
});
