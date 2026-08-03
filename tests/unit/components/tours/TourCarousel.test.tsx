import { render, screen } from "@testing-library/react";
import { TourCarousel } from "@/components/tours/TourCarousel";
import type { TourCardProps } from "@/components/tours/TourCard";

const ONE_TOUR: TourCardProps[] = [
  {
    title: "Solo Tour",
    university: "Solo University",
    guide: "Sam G.",
    durationMinutes: 20,
    price: "$10.00",
  },
];

describe("TourCarousel", () => {
  it("renders a single tour without paging controls breaking (fewer than 2 cards)", () => {
    render(<TourCarousel tours={ONE_TOUR} />);

    expect(screen.getByRole("heading", { name: "Solo Tour" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous tours/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next tours/i })).toBeDisabled();
  });

  it("defaults the mobile 'View all tours' link to '#' when viewAllHref is omitted", () => {
    render(<TourCarousel tours={ONE_TOUR} />);

    expect(screen.getByRole("link", { name: /view all tours/i })).toHaveAttribute("href", "#");
  });

  it("honors a custom viewAllHref", () => {
    render(<TourCarousel tours={ONE_TOUR} viewAllHref="/tours" />);

    expect(screen.getByRole("link", { name: /view all tours/i })).toHaveAttribute("href", "/tours");
  });
});
