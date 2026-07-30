import { renderHook } from "@testing-library/react";

const useQueryMock = jest.fn();
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return { ...actual, useQuery: (...args: unknown[]) => useQueryMock(...args) };
});

import { useEnrollmentYears } from "@/lib/data-access/hooks/use-enrollment-years";
import { enrollmentYearsQuery } from "@/lib/data-access/queries/enrollment-years.query";

beforeEach(() => {
  useQueryMock.mockReset();
});

describe("useEnrollmentYears", () => {
  it("delegates to useQuery(enrollmentYearsQuery()) and returns its result", () => {
    const queryResult = {
      data: {
        entryYear: { min: 2016, max: 2027 },
        maxYearsToGraduate: [{ matches: ["bachelor"], years: 6 }],
        defaultMaxYearsToGraduate: 8,
      },
      isLoading: false,
    };
    useQueryMock.mockReturnValue(queryResult);

    const { result } = renderHook(() => useEnrollmentYears());

    expect(useQueryMock).toHaveBeenCalledTimes(1);
    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.queryKey).toEqual(enrollmentYearsQuery().queryKey);
    // The one-hour staleTime + the explicit hourly ask are the whole point of this query — a hook
    // that quietly dropped them would leave a tab on last year's window.
    expect(passedOptions.staleTime).toBe(enrollmentYearsQuery().staleTime);
    expect(passedOptions.refetchInterval).toBe(enrollmentYearsQuery().refetchInterval);
    expect(result.current).toBe(queryResult);
  });
});
