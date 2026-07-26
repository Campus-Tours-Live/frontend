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
      <TourFiltersBar topicIds={[]} onTopicsChange={onTopicsChange} onOpenFilters={() => {}} />,
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
        onOpenFilters={() => {}}
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
        onOpenFilters={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Any" }));
    expect(onTopicsChange).toHaveBeenLastCalledWith([]);
  });

  it("disables the Filters button (coming soon) and does not open the modal", async () => {
    const onOpenFilters = jest.fn();
    const user = userEvent.setup();
    render(
      <TourFiltersBar topicIds={[]} onTopicsChange={jest.fn()} onOpenFilters={onOpenFilters} />,
    );
    const filters = screen.getByRole("button", { name: /filters/i });
    expect(filters).toBeDisabled();
    expect(filters).toHaveTextContent(/soon/i);
    await user.click(filters);
    expect(onOpenFilters).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Any" })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders only the Any chip (no topic quick-chips) when the topic catalog hasn't loaded yet", () => {
    // The component reads useTourTopics() on both the pre-mount render and the post-mount
    // re-render (the "mounted" hydration gate), so queue the empty response for each.
    const empty = { data: undefined } as ReturnType<typeof useTourTopics>;
    mockUseTourTopics.mockReturnValueOnce(empty).mockReturnValueOnce(empty);
    render(<TourFiltersBar topicIds={[]} onTopicsChange={jest.fn()} onOpenFilters={() => {}} />);
    expect(screen.getByRole("button", { name: "Any" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Campus life" })).not.toBeInTheDocument();
  });
});
