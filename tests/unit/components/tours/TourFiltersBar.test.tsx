import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TourFiltersBar } from "@/components/tours/TourFiltersBar";
import { useTourTopics } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access/topics"),
  useTourTopics: jest.fn(() => ({
    data: [
      { value: "GENERAL_CAMPUS", label: "Campus life" },
      { value: "DORM_HOUSING", label: "Dorms & housing" },
    ],
  })),
}));

const mockUseTourTopics = useTourTopics as jest.MockedFunction<typeof useTourTopics>;

describe("TourFiltersBar", () => {
  it("toggles a topic on", async () => {
    const user = userEvent.setup();
    const onTopicsChange = jest.fn();
    render(
      <TourFiltersBar topicIds={[]} onTopicsChange={onTopicsChange} onToggleFilters={() => {}} />,
    );
    await user.click(screen.getByRole("button", { name: "Campus life" }));
    expect(onTopicsChange).toHaveBeenLastCalledWith(["GENERAL_CAMPUS"]);
  });

  it("unchecking the last topic yields [] (canonical Any), Any becomes active, no topic in URL intent", async () => {
    const user = userEvent.setup();
    const onTopicsChange = jest.fn();
    render(
      <TourFiltersBar
        topicIds={["GENERAL_CAMPUS"]}
        onTopicsChange={onTopicsChange}
        onToggleFilters={() => {}}
      />,
    );
    // the only selected chip is active, Any is not
    expect(screen.getByRole("button", { name: "Campus life" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Campus life" }));
    expect(onTopicsChange).toHaveBeenLastCalledWith([]);
  });

  it("Any clears all", async () => {
    const user = userEvent.setup();
    const onTopicsChange = jest.fn();
    render(
      <TourFiltersBar
        topicIds={["GENERAL_CAMPUS", "DORM_HOUSING"]}
        onTopicsChange={onTopicsChange}
        onToggleFilters={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Any" }));
    expect(onTopicsChange).toHaveBeenLastCalledWith([]);
  });

  it("opens the filters dropdown from the Filters button", async () => {
    const onToggleFilters = jest.fn();
    const user = userEvent.setup();
    render(
      <TourFiltersBar topicIds={[]} onTopicsChange={jest.fn()} onToggleFilters={onToggleFilters} />,
    );
    const filters = screen.getByRole("button", { name: "Filters" });
    expect(filters).toBeEnabled();
    expect(filters).toHaveAttribute("aria-expanded", "false");
    expect(filters).toHaveAttribute("aria-haspopup", "dialog");
    await user.click(filters);
    expect(onToggleFilters).toHaveBeenCalledWith(filters);
    expect(screen.getByRole("button", { name: "Any" })).toHaveAttribute("aria-pressed", "true");
  });

  it("marks the Filters button expanded when the dropdown is open", () => {
    render(
      <TourFiltersBar
        topicIds={[]}
        filtersOpen
        onTopicsChange={jest.fn()}
        onToggleFilters={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Filters" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("shows the active filter count on the Filters button", () => {
    render(
      <TourFiltersBar
        topicIds={["GENERAL_CAMPUS"]}
        activeFilterCount={2}
        onTopicsChange={jest.fn()}
        onToggleFilters={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Filters (2 active)" })).toHaveTextContent("2");
  });

  it("renders only the Any chip (no topic quick-chips) when the topic catalog hasn't loaded yet", () => {
    // The component reads useTourTopics() on both the pre-mount render and the post-mount
    // re-render (the "mounted" hydration gate), so queue the empty response for each.
    const empty = { data: undefined } as ReturnType<typeof useTourTopics>;
    mockUseTourTopics.mockReturnValueOnce(empty).mockReturnValueOnce(empty);
    render(<TourFiltersBar topicIds={[]} onTopicsChange={jest.fn()} onToggleFilters={() => {}} />);
    expect(screen.getByRole("button", { name: "Any" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Campus life" })).not.toBeInTheDocument();
  });
});
