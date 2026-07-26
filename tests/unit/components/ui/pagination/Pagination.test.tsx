import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "@/components/ui/pagination/Pagination";

const noop = () => {};

describe("Pagination", () => {
  it("renders nothing when there is a single page (or none)", () => {
    const { container } = render(<Pagination page={0} totalPages={1} onPageChange={noop} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a window of up to 5 page numbers", () => {
    render(<Pagination page={0} totalPages={10} onPageChange={noop} />);
    for (const n of ["1", "2", "3", "4", "5"]) {
      expect(screen.getByRole("button", { name: `Go to page ${n}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Go to page 6" })).not.toBeInTheDocument();
  });

  it("centers the window on the current page (page 5 of 20 → 3…7)", () => {
    render(<Pagination page={4} totalPages={20} onPageChange={noop} />);
    expect(screen.getByRole("button", { name: "Go to page 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 7" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to page 2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to page 8" })).not.toBeInTheDocument();
  });

  it("clamps the window to the start for early pages (page 2 of 10 → 1…5)", () => {
    render(<Pagination page={1} totalPages={10} onPageChange={noop} />);
    expect(screen.getByRole("button", { name: "Go to page 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 5" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to page 6" })).not.toBeInTheDocument();
  });

  it("pins to the last window near the end (page 10 → 6…10)", () => {
    render(<Pagination page={9} totalPages={10} onPageChange={noop} />);
    expect(screen.getByRole("button", { name: "Go to page 6" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 10" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to page 5" })).not.toBeInTheDocument();
  });

  it("disables previous on the first page and next on the last", () => {
    const { rerender } = render(<Pagination page={0} totalPages={3} onPageChange={noop} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();

    rerender(<Pagination page={2} totalPages={3} onPageChange={noop} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("marks the current page and emits zero-based indices", async () => {
    const onPageChange = jest.fn();
    const user = userEvent.setup();
    render(<Pagination page={0} totalPages={5} onPageChange={onPageChange} />);

    expect(screen.getByRole("button", { name: "Go to page 1" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);

    await user.click(screen.getByRole("button", { name: "Go to page 4" }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
  });

  it("fires onPageChange when the enabled previous button is clicked", async () => {
    const onPageChange = jest.fn();
    const user = userEvent.setup();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
