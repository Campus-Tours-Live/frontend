import { fireEvent, render, screen } from "@testing-library/react";
import { FeaturedTours } from "@/components/home/FeaturedTours";

/**
 * The carousel paging math reads live layout (offsetLeft / clientWidth) and calls
 * scrollTo — neither of which jsdom provides — so we stub the geometry to exercise
 * pageMetrics(), goToPage() and the chevron/dot handlers.
 */
describe("FeaturedTours carousel interactions", () => {
  const scrollToSpy = jest.fn();

  beforeAll(() => {
    Object.defineProperty(Element.prototype, "scrollTo", {
      configurable: true,
      value: scrollToSpy,
    });
  });

  function findScroller(container: HTMLElement): HTMLElement {
    const scroller = Array.from(container.querySelectorAll("div")).find(
      (d) => d.childElementCount === 9,
    );
    if (!scroller) throw new Error("scroller not found");
    Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 320 });
    Array.from(scroller.children).forEach((c, i) =>
      Object.defineProperty(c, "offsetLeft", { configurable: true, value: i * 320 }),
    );
    return scroller;
  }

  const setScrollLeft = (el: Element, value: number) =>
    Object.defineProperty(el, "scrollLeft", { configurable: true, value });

  it("pages via dots and chevrons once real metrics are known", () => {
    scrollToSpy.mockClear();
    const { container } = render(<FeaturedTours />);
    const scroller = findScroller(container);

    // Recompute from the mocked layout: 9 single-card pages, active page 0.
    setScrollLeft(scroller, 0);
    fireEvent.scroll(scroller);

    const next = screen.getByRole("button", { name: /next tours/i });
    expect(next).not.toBeDisabled();
    fireEvent.click(next);
    expect(scrollToSpy).toHaveBeenCalled();

    const dots = screen.getAllByRole("button", { name: /go to page/i });
    expect(dots).toHaveLength(9);
    fireEvent.click(dots[4]);

    // Scroll to the end → Previous becomes enabled.
    setScrollLeft(scroller, 8 * 320);
    fireEvent.scroll(scroller);
    const prev = screen.getByRole("button", { name: /previous tours/i });
    expect(prev).not.toBeDisabled();
    fireEvent.click(prev);

    expect(scrollToSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("clamps the active page for out-of-range scroll positions", () => {
    const { container } = render(<FeaturedTours />);
    const scroller = findScroller(container);

    // Past the end → Math.min clamps active to the last page.
    setScrollLeft(scroller, 999 * 320);
    fireEvent.scroll(scroller);
    expect(screen.getByRole("button", { name: /next tours/i })).toBeDisabled();

    // Negative (rubber-band) → Math.max clamps active to 0.
    setScrollLeft(scroller, -500);
    fireEvent.scroll(scroller);
    expect(screen.getByRole("button", { name: /previous tours/i })).toBeDisabled();
  });
});
