import { renderHook } from "@testing-library/react";

const useQueriesMock = jest.fn();
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return { ...actual, useQueries: (...args: unknown[]) => useQueriesMock(...args) };
});

import { useUniversityDetails } from "@/lib/data-access/hooks/use-university-details";
import { universityDetailOptions } from "@/lib/data-access/queries/university-detail.query";

describe("useUniversityDetails", () => {
  beforeEach(() => {
    useQueriesMock.mockReset();
  });

  it("asks for one detail query per slug, in order, and returns the results as-is", () => {
    const results = [{ data: { slug: "a" } }, { data: { slug: "b" } }];
    useQueriesMock.mockReturnValue(results);

    const { result } = renderHook(() => useUniversityDetails(["a", "b"]));

    const { queries } = useQueriesMock.mock.calls[0][0];
    expect(queries.map((q: { queryKey: unknown }) => q.queryKey)).toEqual([
      universityDetailOptions("a").queryKey,
      universityDetailOptions("b").queryKey,
    ]);
    expect(result.current).toBe(results);
  });
});
