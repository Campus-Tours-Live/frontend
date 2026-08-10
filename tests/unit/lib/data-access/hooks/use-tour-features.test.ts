import { renderHook } from "@testing-library/react";

const useQueryMock = jest.fn();
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return { ...actual, useQuery: (...args: unknown[]) => useQueryMock(...args) };
});

import { useTourFeatures } from "@/lib/data-access/hooks/use-tour-features";

describe("useTourFeatures", () => {
  it("no data yet → empty byTopic/labelByCode, loading reflected", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    const { result, rerender } = renderHook(() => useTourFeatures());

    expect(result.current.byTopic).toEqual({});
    expect(result.current.labelByCode).toEqual({});
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);

    const firstEmpty = result.current.byTopic;
    rerender();
    expect(result.current.byTopic).toBe(firstEmpty);
  });

  it("flattens per-topic options into a code→label map", () => {
    useQueryMock.mockReturnValue({
      data: {
        ACCESSIBILITY: [
          { value: "WHEELCHAIR", label: "Wheelchair accessible" },
          { value: "ELEVATOR", label: "Elevator access" },
        ],
        DINING: [{ value: "VEGAN", label: "Vegan options" }],
      },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useTourFeatures());

    expect(result.current.byTopic).toEqual({
      ACCESSIBILITY: [
        { value: "WHEELCHAIR", label: "Wheelchair accessible" },
        { value: "ELEVATOR", label: "Elevator access" },
      ],
      DINING: [{ value: "VEGAN", label: "Vegan options" }],
    });
    expect(result.current.labelByCode).toEqual({
      WHEELCHAIR: "Wheelchair accessible",
      ELEVATOR: "Elevator access",
      VEGAN: "Vegan options",
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("surfaces isError from the underlying query", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    const { result } = renderHook(() => useTourFeatures());

    expect(result.current.isError).toBe(true);
    expect(result.current.byTopic).toEqual({});
    expect(result.current.labelByCode).toEqual({});
  });
});
