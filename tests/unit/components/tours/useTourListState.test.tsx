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
  it("derives topic/sort/page (0-based) from the URL", () => {
    search = "q=housing&topic=DORM_HOUSING&sort=RATING&page=3";
    const { result } = renderHook(() => useTourListState());
    expect(result.current.query).toBe("housing");
    expect(result.current.topic).toBe("DORM_HOUSING");
    expect(result.current.sort).toBe("RATING");
    expect(result.current.page).toBe(2); // 3 (1-based) -> 2 (0-based)
  });

  it("defaults when params are absent or invalid", () => {
    search = "sort=BOGUS";
    const { result } = renderHook(() => useTourListState());
    expect(result.current.topic).toBe("");
    expect(result.current.sort).toBe("RECOMMENDED");
    expect(result.current.page).toBe(0);
  });

  it("changeTopic replaces the URL with the topic and drops page", () => {
    search = "page=4";
    const { result } = renderHook(() => useTourListState());
    act(() => result.current.changeTopic("FRESHMAN"));
    expect(replace).toHaveBeenCalledWith("/tours?topic=FRESHMAN", { scroll: false });
    expect(push).not.toHaveBeenCalled();
  });

  it("changeSort=RECOMMENDED removes the sort param (default omitted)", () => {
    search = "sort=RATING";
    const { result } = renderHook(() => useTourListState());
    act(() => result.current.changeSort("RECOMMENDED"));
    expect(replace).toHaveBeenCalledWith("/tours", { scroll: false });
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
});
