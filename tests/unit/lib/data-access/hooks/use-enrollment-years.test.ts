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
    // The WHOLE options object, not a field-by-field spot check: the staleTime, the hourly
    // refetchInterval, refetchIntervalInBackground and the focus-refetch override are all load
    // bearing (I6), and asserting them one at a time against the factory means an option dropped
    // from BOTH sides compares undefined to undefined and passes.
    expect(useQueryMock).toHaveBeenCalledWith({
      ...enrollmentYearsQuery(),
      // The factory mints a fresh arrow per call, so identity can never match; its behaviour is
      // covered by enrollment-years.query.test.ts. Every other key is compared exactly, and an
      // extra or missing one fails the whole object.
      queryFn: expect.any(Function),
    });
    expect(result.current).toBe(queryResult);
  });
});
