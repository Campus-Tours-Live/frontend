import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
jest.mock("@/components/site/SiteHeader", () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));

import TourDetailPage, { generateMetadata, generateStaticParams } from "@/app/tours/[tourId]/page";

describe("/tours/[tourId] page", () => {
  it("renders the tour, guide, schedule, and booking action", async () => {
    const element = await TourDetailPage({
      params: Promise.resolve({ tourId: "north-coast-campus-life" }),
    });
    render(element);

    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Campus life and hidden study spots",
    );
    expect(screen.getByText("Maya Chen")).toBeInTheDocument();
    expect(screen.getByText("Saturday, July 18")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /book/i })).toHaveLength(2);
  });

  it("returns not found for an unknown tour", async () => {
    await expect(
      TourDetailPage({ params: Promise.resolve({ tourId: "missing-tour" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("generates route params and descriptive metadata", async () => {
    expect(generateStaticParams()).toContainEqual({ tourId: "north-coast-campus-life" });
    await expect(
      generateMetadata({ params: Promise.resolve({ tourId: "north-coast-campus-life" }) }),
    ).resolves.toMatchObject({ title: expect.stringContaining("North Coast University") });
  });
});
