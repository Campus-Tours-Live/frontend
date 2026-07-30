import { renderHook } from "@testing-library/react";

const useQueryMock = jest.fn();
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return { ...actual, useQuery: (...args: unknown[]) => useQueryMock(...args) };
});

import { useMe } from "@/lib/data-access/hooks/use-me";
import { pendingMe, provisionedMe } from "../../../support/meFixtures";

describe("useMe", () => {
  it("null principal → loading, not onboarded, no roles", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useMe());
    expect(result.current.me).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.hasRole("GUIDE")).toBe(false);
  });

  it("PROVISIONED principal with roles → onboarded, membership reflected", () => {
    useQueryMock.mockReturnValue({
      data: provisionedMe({ roles: ["PARTICIPANT"] }),
      isLoading: false,
    });
    const { result } = renderHook(() => useMe());
    expect(result.current.isOnboarded).toBe(true);
    expect(result.current.hasRole("PARTICIPANT")).toBe(true);
    expect(result.current.hasRole("GUIDE")).toBe(false);
  });

  it("PENDING principal (no roles yet) → not onboarded, gated on provisioningStatus not roles.length", () => {
    useQueryMock.mockReturnValue({ data: pendingMe(), isLoading: false });
    const { result } = renderHook(() => useMe());
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.hasRole("PARTICIPANT")).toBe(false);
  });
});
