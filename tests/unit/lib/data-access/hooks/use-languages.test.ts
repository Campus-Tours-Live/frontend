import { renderHook } from "@testing-library/react";

const useQueryMock = jest.fn();
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return { ...actual, useQuery: (...args: unknown[]) => useQueryMock(...args) };
});

import { useLanguages } from "@/lib/data-access/hooks/use-languages";

describe("useLanguages", () => {
  it("delegates to the languages meta query", () => {
    const data = [{ value: "en-US", label: "English" }];
    useQueryMock.mockReturnValue({ data, isLoading: false, isError: false });

    const { result } = renderHook(() => useLanguages());

    expect(result.current.data).toEqual(data);
    expect(useQueryMock).toHaveBeenCalled();
  });
});
