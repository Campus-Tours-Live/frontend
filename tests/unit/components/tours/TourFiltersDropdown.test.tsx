import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { TourFiltersDropdown } from "@/components/tours/TourFiltersDropdown";
import { useTourCatalog, useTourTopics, type TourCatalogFilters } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access/topics"),
  useTourTopics: jest.fn(() => ({
    data: [
      { value: "GENERAL_CAMPUS", label: "Campus life" },
      { value: "DORM_HOUSING", label: "Dorms & housing" },
    ],
  })),
  useTourCatalog: jest.fn((filters: TourCatalogFilters) => ({
    data: {
      items: [],
      page: 0,
      size: 1,
      totalPages: 1,
      totalElements: filters.topicIds?.includes("GENERAL_CAMPUS")
        ? 11
        : filters.topicIds?.includes("DORM_HOUSING")
          ? 7
          : 42,
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

const mockUseTourTopics = useTourTopics as jest.MockedFunction<typeof useTourTopics>;
const mockUseTourCatalog = useTourCatalog as jest.MockedFunction<typeof useTourCatalog>;

function renderDropdown(props: Partial<ComponentProps<typeof TourFiltersDropdown>> = {}) {
  const anchorEl = document.createElement("button");
  anchorEl.textContent = "Filters";
  document.body.appendChild(anchorEl);

  const onApply = jest.fn();
  const onClose = jest.fn();
  const view = render(
    <TourFiltersDropdown
      open
      anchorEl={anchorEl}
      topicIds={[]}
      sort="RECOMMENDED"
      resultCount={42}
      onApply={onApply}
      onClose={onClose}
      {...props}
    />,
  );

  return { anchorEl, onApply, onClose, ...view };
}

beforeEach(() => {
  mockUseTourCatalog.mockClear();
});

afterEach(() => {
  document.body.querySelectorAll("button").forEach((button) => {
    if (button.textContent === "Filters") button.remove();
  });
});

describe("TourFiltersDropdown", () => {
  it("renders as an anchored dropdown, not a modal backdrop", () => {
    renderDropdown();

    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Filters" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });

  it("applies draft topic and sort choices only on Show N tours", async () => {
    const user = userEvent.setup();
    const { onApply, onClose } = renderDropdown();

    await user.click(screen.getByRole("button", { name: "Campus life" }));
    await user.selectOptions(screen.getByLabelText("Sort by"), "RATING");
    expect(onApply).not.toHaveBeenCalled(); // draft only

    await user.click(screen.getByRole("button", { name: "Show 11 tours" }));
    expect(onApply).toHaveBeenCalledWith({ topicIds: ["GENERAL_CAMPUS"], sort: "RATING" });
    expect(onClose).toHaveBeenCalled();
  });

  it("updates the Show count when the draft topic selection changes", async () => {
    const user = userEvent.setup();
    renderDropdown();

    expect(screen.getByRole("button", { name: "Show 42 tours" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dorms & housing" }));

    expect(screen.getByRole("button", { name: "Show 7 tours" })).toBeInTheDocument();
    expect(mockUseTourCatalog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        topicIds: ["DORM_HOUSING"],
        limit: 1,
        page: 0,
      }),
      { enabled: true },
    );
  });

  it("resets the draft to Any topic and Recommended on Clear all without applying", async () => {
    const user = userEvent.setup();
    const { onApply } = renderDropdown({
      topicIds: ["GENERAL_CAMPUS"],
      sort: "RATING",
      resultCount: 5,
    });

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByRole("button", { name: "Any topic" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Sort by")).toHaveValue("RECOMMENDED");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("reseeds the draft from props when reopened, discarding unapplied edits", async () => {
    const user = userEvent.setup();
    const { anchorEl, onApply, rerender } = renderDropdown();

    await user.click(screen.getByRole("button", { name: "Campus life" }));
    await user.selectOptions(screen.getByLabelText("Sort by"), "RATING");

    rerender(
      <TourFiltersDropdown
        open={false}
        anchorEl={anchorEl}
        topicIds={[]}
        sort="RECOMMENDED"
        resultCount={5}
        onApply={onApply}
        onClose={jest.fn()}
      />,
    );
    rerender(
      <TourFiltersDropdown
        open
        anchorEl={anchorEl}
        topicIds={["DORM_HOUSING"]}
        sort="PRICE_ASC"
        resultCount={5}
        onApply={onApply}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Campus life" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Dorms & housing" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Sort by")).toHaveValue("PRICE_ASC");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("renders only Any topic when the topic catalog has not loaded yet", () => {
    mockUseTourTopics.mockReturnValueOnce({ data: undefined } as ReturnType<typeof useTourTopics>);
    renderDropdown({ resultCount: 0 });

    expect(screen.getByRole("button", { name: "Any topic" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Campus life" })).not.toBeInTheDocument();
  });
});
