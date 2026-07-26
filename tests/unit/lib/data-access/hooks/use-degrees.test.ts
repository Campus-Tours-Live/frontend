import { renderHook } from "@testing-library/react";

const useQueryMock = jest.fn();
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return { ...actual, useQuery: (...args: unknown[]) => useQueryMock(...args) };
});

import { useDegrees } from "@/lib/data-access/hooks/use-degrees";
import { degreeOptionsQuery } from "@/lib/data-access/queries/degrees.query";

beforeEach(() => {
  useQueryMock.mockReset();
});

describe("useDegrees", () => {
  it("delegates to useQuery(degreeOptionsQuery(schoolId)) and returns its result", () => {
    const queryResult = {
      data: [{ value: "Bachelor's Degree", label: "Bachelor's Degree" }],
      isLoading: false,
    };
    useQueryMock.mockReturnValue(queryResult);

    const { result } = renderHook(() => useDegrees("243744"));

    expect(useQueryMock).toHaveBeenCalledTimes(1);
    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.queryKey).toEqual(degreeOptionsQuery("243744").queryKey);
    expect(passedOptions.enabled).toBe(true);
    expect(result.current).toBe(queryResult);
  });

  it("treats a null schoolId as an empty schoolId (disabled query)", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useDegrees(null));

    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.queryKey).toEqual(degreeOptionsQuery("").queryKey);
    expect(passedOptions.enabled).toBe(false);
  });

  it("treats an undefined schoolId as an empty schoolId (disabled query)", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useDegrees(undefined));

    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.queryKey).toEqual(degreeOptionsQuery("").queryKey);
    expect(passedOptions.enabled).toBe(false);
  });
});
