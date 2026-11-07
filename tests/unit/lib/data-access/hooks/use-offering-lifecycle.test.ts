import { renderHook } from "@testing-library/react";

const useMutationMock = jest.fn();
const useQueryClientMock = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useQueryClient: () => useQueryClientMock(),
}));

jest.mock("@/lib/data-access/mutations/offering-lifecycle.mutation", () => ({
  updateOfferingMutation: jest.fn(() => ({ kind: "update" })),
  pauseOfferingMutation: jest.fn(() => ({ kind: "pause" })),
  retireOfferingMutation: jest.fn(() => ({ kind: "retire" })),
  duplicateOfferingMutation: jest.fn(() => ({ kind: "duplicate" })),
}));

import {
  useDuplicateOffering,
  usePauseOffering,
  useRetireOffering,
  useUpdateOffering,
} from "@/lib/data-access/hooks/use-offering-lifecycle";

beforeEach(() => {
  useMutationMock.mockReset().mockReturnValue({ mutation: true });
  useQueryClientMock.mockReset().mockReturnValue({});
});

it.each([
  ["update", useUpdateOffering],
  ["pause", usePauseOffering],
  ["retire", useRetireOffering],
  ["duplicate", useDuplicateOffering],
])("use%sOffering delegates to TanStack Query", (_label, hook) => {
  const { result } = renderHook(() => hook());
  expect(useMutationMock).toHaveBeenCalledTimes(1);
  expect(result.current).toEqual({ mutation: true });
});
