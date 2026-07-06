jest.mock("@/components/availability/GuideAvailabilityPage", () => ({
  GuideAvailabilityPage: () => <div data-testid="guide-availability-page" />,
}));

import { render, screen } from "@testing-library/react";
import GuideAvailabilityRoutePage from "@/app/(app)/guide/availability/page";

describe("guide availability route page", () => {
  it("mounts GuideAvailabilityPage", () => {
    render(<GuideAvailabilityRoutePage />);
    expect(screen.getByTestId("guide-availability-page")).toBeInTheDocument();
  });
});
