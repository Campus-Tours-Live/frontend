import { act, renderHook } from "@testing-library/react";
import { useTourListState } from "@/components/tours/useTourListState";

const replace = jest.fn();
const push = jest.fn();
let search = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => "/tours",
  useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => {
  replace.mockReset();
  push.mockReset();
  search = "";
});

describe("useTourListState", () => {
  it("derives sort/page (0-based) from the URL", () => {
    search = "q=housing&topic=DORM_HOUSING&sort=RATING&page=3";
    const { result } = renderHook(() => useTourListState());
    expect(result.current.query).toBe("housing");
    expect(result.current.sort).toBe("RATING");
    expect(result.current.page).toBe(2); // 3 (1-based) -> 2 (0-based)
  });

  it("defaults when params are absent or invalid", () => {
    search = "sort=BOGUS";
    const { result } = renderHook(() => useTourListState());
    expect(result.current.topicIds).toEqual([]);
    expect(result.current.sort).toBe("RECOMMENDED");
    expect(result.current.page).toBe(0);
  });

  it("reads repeated + comma topic params, deduped, into topicIds", () => {
    search = "topic=GENERAL_CAMPUS,GENERAL_CAMPUS&topic=DORM_HOUSING";
    const { result } = renderHook(() => useTourListState());
    expect(result.current.topicIds).toEqual(["GENERAL_CAMPUS", "DORM_HOUSING"]);
  });

  it("reads universityId from the URL", () => {
    search = "universityId=abc-123";
    const { result } = renderHook(() => useTourListState());
    expect(result.current.universityId).toBe("abc-123");
  });

  it("changeTopics writes repeated params and resets page", () => {
    const { result } = renderHook(() => useTourListState());
    act(() => result.current.changeTopics(["GENERAL_CAMPUS", "DORM_HOUSING"]));
    const url = replace.mock.calls.at(-1)![0] as string;
    expect(url).toContain("topic=GENERAL_CAMPUS");
    expect(url).toContain("topic=DORM_HOUSING");
    expect(url).not.toContain("page=");
  });

  it("changeTopics([]) clears the topic param", () => {
    search = "topic=GENERAL_CAMPUS";
    const { result } = renderHook(() => useTourListState());
    act(() => result.current.changeTopics([]));
    expect(replace.mock.calls.at(-1)![0] as string).not.toContain("topic=");
  });

  it("changeSort=RECOMMENDED removes the sort param (default omitted)", () => {
    search = "sort=RATING";
    const { result } = renderHook(() => useTourListState());
    act(() => result.current.changeSort("RECOMMENDED"));
    expect(replace).toHaveBeenCalledWith("/tours", { scroll: false });
  });

  it("changeFilters writes topic and sort together while resetting page", () => {
    search = "q=campus&page=3";
    const { result } = renderHook(() => useTourListState());
    act(() => result.current.changeFilters({ topicIds: ["GENERAL_CAMPUS"], sort: "PRICE_ASC" }));
    expect(replace).toHaveBeenCalledWith("/tours?q=campus&sort=PRICE_ASC&topic=GENERAL_CAMPUS", {
      scroll: false,
    });
  });

  it("setPage pushes a 1-based page param; page 0 omits it", () => {
    const { result } = renderHook(() => useTourListState());
    act(() => result.current.setPage(2));
    expect(push).toHaveBeenCalledWith("/tours?page=3", { scroll: false });
    act(() => result.current.setPage(0));
    expect(push).toHaveBeenLastCalledWith("/tours", { scroll: false });
  });

  it("reset clears the URL", () => {
    search = "q=x&topic=FRESHMAN&page=2";
    const { result } = renderHook(() => useTourListState());
    act(() => result.current.reset());
    expect(replace).toHaveBeenCalledWith("/tours", { scroll: false });
  });

  it("syncs the local query when the URL's q changes externally (e.g. back/forward)", () => {
    search = "q=first";
    const { result, rerender } = renderHook(() => useTourListState());
    expect(result.current.query).toBe("first");

    search = "q=second";
    rerender();
    expect(result.current.query).toBe("second");
  });

  describe("debounced query -> URL sync", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it("writes a non-empty query to the URL after the debounce delay", () => {
      const { result } = renderHook(() => useTourListState());
      act(() => result.current.changeQuery("boston"));
      expect(replace).not.toHaveBeenCalled(); // not yet — still debouncing

      act(() => jest.advanceTimersByTime(250));
      expect(replace).toHaveBeenCalledWith("/tours?q=boston", { scroll: false });
    });

    it("clears the q param from the URL when the query is emptied", () => {
      search = "q=boston";
      const { result } = renderHook(() => useTourListState());
      expect(result.current.query).toBe("boston");

      act(() => result.current.changeQuery(""));
      act(() => jest.advanceTimersByTime(250));
      expect(replace).toHaveBeenLastCalledWith("/tours", { scroll: false });
    });
  });
});
