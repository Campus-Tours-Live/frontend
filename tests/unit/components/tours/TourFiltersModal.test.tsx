import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TourFiltersModal } from "@/components/tours/TourFiltersModal";

describe("TourFiltersModal", () => {
  it("applies the draft sort only on Show N tours, and omits Topic", async () => {
    const onApply = jest.fn();
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <TourFiltersModal
        open
        sort="RECOMMENDED"
        resultCount={42}
        onApply={onApply}
        onClose={onClose}
      />,
    );
    expect(screen.queryByLabelText(/topic/i)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Sort by"), "RATING");
    expect(onApply).not.toHaveBeenCalled(); // draft only
    await user.click(screen.getByRole("button", { name: "Show 42 tours" }));
    expect(onApply).toHaveBeenCalledWith({ sort: "RATING" });
    expect(onClose).toHaveBeenCalled();
  });

  it("resets the draft to Recommended on Clear all without applying", async () => {
    const onApply = jest.fn();
    const user = userEvent.setup();
    render(
      <TourFiltersModal open sort="RATING" resultCount={5} onApply={onApply} onClose={jest.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByLabelText("Sort by")).toHaveValue("RECOMMENDED");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("reseeds the draft from the sort prop when reopened, discarding an unapplied edit", async () => {
    const onApply = jest.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <TourFiltersModal
        open
        sort="RECOMMENDED"
        resultCount={5}
        onApply={onApply}
        onClose={jest.fn()}
      />,
    );
    // user edits the draft but does NOT apply
    await user.selectOptions(screen.getByLabelText("Sort by"), "RATING");
    // close, then reopen with a different committed sort
    rerender(
      <TourFiltersModal
        open={false}
        sort="RECOMMENDED"
        resultCount={5}
        onApply={onApply}
        onClose={jest.fn()}
      />,
    );
    rerender(
      <TourFiltersModal
        open
        sort="PRICE_ASC"
        resultCount={5}
        onApply={onApply}
        onClose={jest.fn()}
      />,
    );
    // draft reseeds from the current `sort` prop (PRICE_ASC), NOT the abandoned RATING edit
    expect(screen.getByLabelText("Sort by")).toHaveValue("PRICE_ASC");
    expect(onApply).not.toHaveBeenCalled();
  });
});
