import { renderHook } from "@testing-library/react";

const useQueryMock = jest.fn();
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return { ...actual, useQuery: (...args: unknown[]) => useQueryMock(...args) };
});

import { useTourDetail } from "@/lib/data-access/hooks/use-tour-detail";
import { tourDetailOptions } from "@/lib/data-access/queries/tours.query";

describe("useTourDetail", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
  });

  it("calls useQuery with tourDetailOptions(id) and returns its result as-is", () => {
    const queryResult = { data: { id: "t1", title: "Campus tour" }, isLoading: false };
    useQueryMock.mockReturnValue(queryResult);

    const { result } = renderHook(() => useTourDetail("t1"));

    expect(useQueryMock).toHaveBeenCalledTimes(1);
    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.queryKey).toEqual(tourDetailOptions("t1").queryKey);
    expect(passedOptions.enabled).toBe(true);
    expect(result.current).toBe(queryResult);
  });

  it("passes enabled: false through when id is empty", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useTourDetail(""));

    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.enabled).toBe(false);
  });
});
