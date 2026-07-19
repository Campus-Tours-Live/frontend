import { renderHook } from "@testing-library/react";

const useQueryMock = jest.fn();
const useMutationMock = jest.fn();
const useQueryClientMock = jest.fn();
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => useQueryMock(...args),
    useMutation: (...args: unknown[]) => useMutationMock(...args),
    useQueryClient: (...args: unknown[]) => useQueryClientMock(...args),
  };
});

import {
  useAvailabilityExceptions,
  useAvailabilityRules,
  useAvailabilitySettings,
  useOfferingSlots,
  useOverrideMultiPreview,
  useReplaceOverrides,
  useReplaceRules,
  useResolvedAvailability,
  useUpdateAvailabilityRule,
  useUpdateAvailabilitySettings,
} from "@/lib/data-access/hooks/use-guide-availability";
import { overrideMultiPreviewOptions } from "@/lib/data-access/queries/override-multi-preview.query";
import { offeringSlotsOptions } from "@/lib/data-access/queries/offering-slots.query";

beforeEach(() => {
  useQueryMock.mockReset();
  useMutationMock.mockReset();
  useQueryClientMock.mockReset();
  useQueryClientMock.mockReturnValue({ invalidateQueries: jest.fn() });
});

describe("simple query hooks", () => {
  it("useAvailabilityRules delegates to useQuery(availabilityRulesOptions())", () => {
    const queryResult = { data: [], isLoading: false };
    useQueryMock.mockReturnValue(queryResult);
    const { result } = renderHook(() => useAvailabilityRules());
    expect(result.current).toBe(queryResult);
    expect(useQueryMock).toHaveBeenCalledTimes(1);
  });

  it("useAvailabilityExceptions delegates to useQuery(availabilityExceptionsOptions())", () => {
    const queryResult = { data: [], isLoading: false };
    useQueryMock.mockReturnValue(queryResult);
    const { result } = renderHook(() => useAvailabilityExceptions());
    expect(result.current).toBe(queryResult);
  });

  it("useAvailabilitySettings delegates to useQuery(availabilitySettingsOptions())", () => {
    const queryResult = { data: {}, isLoading: false };
    useQueryMock.mockReturnValue(queryResult);
    const { result } = renderHook(() => useAvailabilitySettings());
    expect(result.current).toBe(queryResult);
  });

  it("useResolvedAvailability delegates to useQuery(resolvedAvailabilityOptions())", () => {
    const queryResult = { data: { bookable: true }, isLoading: false };
    useQueryMock.mockReturnValue(queryResult);
    const { result } = renderHook(() => useResolvedAvailability());
    expect(result.current).toBe(queryResult);
  });
});

describe("useOfferingSlots", () => {
  it("defaults enabled to Boolean(offeringId) when options.enabled is not passed", () => {
    useQueryMock.mockReturnValue({ data: [], isLoading: false });

    renderHook(() => useOfferingSlots("o1"));

    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.queryKey).toEqual(offeringSlotsOptions("o1", true).queryKey);
    expect(passedOptions.enabled).toBe(true);
  });

  it("treats an empty offeringId as disabled by default", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useOfferingSlots(""));

    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.enabled).toBe(false);
  });

  it("respects an explicit options.enabled override", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useOfferingSlots("o1", { enabled: false }));

    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.enabled).toBe(false);
  });
});

describe("useOverrideMultiPreview", () => {
  const params = {
    dateFrom: "2026-08-01",
    dateTo: "2026-08-03",
    kind: "UNAVAILABLE" as const,
    windows: [{ startLocal: "09:30", windowMin: 90 }],
  };

  it("delegates to useQuery(overrideMultiPreviewOptions(params)) and returns its result", () => {
    const queryResult = { data: { days: [], valid: true, message: null }, isLoading: false };
    useQueryMock.mockReturnValue(queryResult);

    const { result } = renderHook(() => useOverrideMultiPreview(params));

    expect(useQueryMock).toHaveBeenCalledTimes(1);
    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.queryKey).toEqual(overrideMultiPreviewOptions(params).queryKey);
    expect(passedOptions.enabled).toBe(true);
    expect(result.current).toBe(queryResult);
  });

  it("is disabled (enabled: false) when params is null", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useOverrideMultiPreview(null));

    const passedOptions = useQueryMock.mock.calls[0][0];
    expect(passedOptions.queryKey).toEqual(overrideMultiPreviewOptions(null).queryKey);
    expect(passedOptions.enabled).toBe(false);
  });
});

describe("mutation hooks", () => {
  it("useUpdateAvailabilityRule wires the query client into the mutation factory", () => {
    const mutationResult = { mutate: jest.fn(), isPending: false };
    useMutationMock.mockReturnValue(mutationResult);

    const { result } = renderHook(() => useUpdateAvailabilityRule());

    expect(result.current).toBe(mutationResult);
    expect(useMutationMock).toHaveBeenCalledTimes(1);
    const passedArg = useMutationMock.mock.calls[0][0];
    expect(typeof passedArg.mutationFn).toBe("function");
  });

  it("useReplaceOverrides wires the query client into the mutation factory", () => {
    const mutationResult = { mutate: jest.fn(), isPending: false };
    useMutationMock.mockReturnValue(mutationResult);

    const { result } = renderHook(() => useReplaceOverrides());

    expect(result.current).toBe(mutationResult);
  });

  it("useReplaceRules wires the query client into the mutation factory", () => {
    const mutationResult = { mutate: jest.fn(), isPending: false };
    useMutationMock.mockReturnValue(mutationResult);

    const { result } = renderHook(() => useReplaceRules());

    expect(result.current).toBe(mutationResult);
  });

  it("useUpdateAvailabilitySettings wires the query client into the mutation factory", () => {
    const mutationResult = { mutate: jest.fn(), isPending: false };
    useMutationMock.mockReturnValue(mutationResult);

    const { result } = renderHook(() => useUpdateAvailabilitySettings());

    expect(result.current).toBe(mutationResult);
  });
});
