import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TourFiltersBar } from "@/components/tours/TourFiltersBar";

jest.mock("@/lib/data-access", () => ({
  useTourTopics: () => ({
    data: [
      { value: "GENERAL_CAMPUS", label: "Campus life" },
      { value: "DORM_HOUSING", label: "Dorms & housing" },
    ],
  }),
}));

describe("TourFiltersBar", () => {
  it("marks the active topic and applies a chip instantly", async () => {
    const onTopicChange = jest.fn();
    const user = userEvent.setup();
    render(
      <TourFiltersBar
        topic="GENERAL_CAMPUS"
        onTopicChange={onTopicChange}
        onOpenFilters={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Campus life" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Dorms & housing" }));
    expect(onTopicChange).toHaveBeenCalledWith("DORM_HOUSING");
  });

  it("opens the filters modal", async () => {
    const onOpenFilters = jest.fn();
    const user = userEvent.setup();
    render(<TourFiltersBar topic="" onTopicChange={jest.fn()} onOpenFilters={onOpenFilters} />);
    await user.click(screen.getByRole("button", { name: /filters/i }));
    expect(onOpenFilters).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Any" })).toHaveAttribute("aria-pressed", "true");
  });
});
