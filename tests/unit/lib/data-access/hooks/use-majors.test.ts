import { renderHook } from "@testing-library/react";

const useQueryMock = jest.fn();
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return { ...actual, useQuery: (...args: unknown[]) => useQueryMock(...args) };
});

import { useMajors } from "@/lib/data-access/hooks/use-majors";
import { majorOptionsQuery } from "@/lib/data-access/queries/majors.query";

beforeEach(() => {
  useQueryMock.mockReset();
});

describe("useMajors", () => {
  it("delegates to useQuery(majorOptionsQuery(schoolId)) and returns its result", () => {
    const queryResult = { data: [{ value: "CS", label: "Computer Science" }], isLoading: false };
    useQueryMock.mockReturnValue(queryResult);

    const { result } = renderHook(() => useMajors("243744"));

    expect(useQueryMock).toHaveBeenCalledTimes(1);
    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.queryKey).toEqual(majorOptionsQuery("243744").queryKey);
    expect(passedOptions.enabled).toBe(true);
    expect(result.current).toBe(queryResult);
  });

  it("treats a null schoolId as an empty schoolId (disabled query)", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useMajors(null));

    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.queryKey).toEqual(majorOptionsQuery("").queryKey);
    expect(passedOptions.enabled).toBe(false);
  });

  it("treats an undefined schoolId as an empty schoolId (disabled query)", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useMajors(undefined));

    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.queryKey).toEqual(majorOptionsQuery("").queryKey);
    expect(passedOptions.enabled).toBe(false);
  });
});
