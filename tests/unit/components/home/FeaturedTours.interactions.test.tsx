import { fireEvent, render, screen } from "@testing-library/react";
import { FeaturedTours } from "@/components/home/FeaturedTours";
import { useTourCatalog, type TourSummary } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useTourCatalog: jest.fn(),
}));

const mockUseTourCatalog = useTourCatalog as jest.MockedFunction<typeof useTourCatalog>;

function tour(id: string): TourSummary {
  return {
    id,
    title: `Tour ${id}`,
    slug: id,
    topic: "GENERAL_CAMPUS",
    universityId: "u1",
    universityName: "North Coast University",
    guideId: "g1",
    guideDisplayName: "Maya Chen",
    guideMajor: "Computer Science",
    guideDegree: "BS",
    guideEntryYear: 2023,
    durationMin: 60,
    priceCents: 4200,
    currency: "USD",
    avgRating: 4.8,
    reviewCount: 18,
    languages: ["en-US"],
    features: [],
    isNew: false,
  };
}

const NINE_TOURS: TourSummary[] = Array.from({ length: 9 }, (_, i) => tour(`t${i + 1}`));

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTourCatalog.mockReturnValue({
      data: { items: NINE_TOURS, page: 0, size: 20, totalPages: 1, totalElements: 9 },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useTourCatalog>);
  });

  function findScroller(container: HTMLElement): HTMLElement {
    const scroller = Array.from(container.querySelectorAll("div")).find(
      (d) => d.childElementCount === 9,
    );
    if (!scroller) throw new Error("scroller not found");
    Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 320 });
    // Real browsers derive the max scroll position from scrollWidth; jsdom doesn't
    // lay anything out, so it must be stubbed too (9 single-card pages @ 320px each).
    Object.defineProperty(scroller, "scrollWidth", { configurable: true, value: 9 * 320 });
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
