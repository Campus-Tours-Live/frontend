import { act, renderHook } from "@testing-library/react";
import { useGuideBookingFilter } from "@/components/bookings/useGuideBookingFilter";

const replace = jest.fn();
let search = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/guide/bookings",
  useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => {
  replace.mockReset();
  search = "";
});

describe("useGuideBookingFilter", () => {
  it("reads filter from the URL", () => {
    search = "filter=upcoming";
    const { result } = renderHook(() => useGuideBookingFilter());
    expect(result.current.filter).toBe("upcoming");
  });

  it("defaults to all when filter is missing or invalid", () => {
    search = "filter=nope";
    const { result } = renderHook(() => useGuideBookingFilter());
    expect(result.current.filter).toBe("all");
  });

  it("writes filter to the URL and clears it for all", () => {
    const { result } = renderHook(() => useGuideBookingFilter());
    act(() => result.current.setFilter("pending"));
    expect(replace).toHaveBeenCalledWith("/guide/bookings?filter=pending");

    act(() => result.current.setFilter("all"));
    expect(replace).toHaveBeenLastCalledWith("/guide/bookings");
  });
});
