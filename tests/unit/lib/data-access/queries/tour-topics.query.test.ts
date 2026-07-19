import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { tourTopicsOptions } from "@/lib/data-access/queries/tour-topics.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("tourTopicsOptions", () => {
  it("uses the tourTopics queryKey", () => {
    expect(tourTopicsOptions().queryKey).toEqual(queryKeys.tourTopics());
    expect(tourTopicsOptions().queryKey).toEqual(["tour-topics"]);
  });

  it("queryFn fetches /v1/meta/tour-topics with interactive:false and returns the resolved value", async () => {
    const payload = [{ id: "t1" }];
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = tourTopicsOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/meta/tour-topics", { interactive: false });
    expect(result).toBe(payload);
  });

  it("never goes stale within a session (staleTime: Infinity)", () => {
    expect(tourTopicsOptions().staleTime).toBe(Infinity);
  });
});

describe("tour-topics caching (regression: header remounts must not refetch)", () => {
  // Real timers on purpose: with staleTime: Infinity the cached value is fresh for the client's
  // whole lifetime, so "no refetch on remount" holds for ANY elapsed time — advancing a clock is
  // only meaningful for a finite TTL, and mixing fake timers with React Query's async scheduling
  // is fragile. Mounting → unmounting → remounting a consumer (as the header does on every
  // navigation) is the exact behaviour the 30s provider default used to break.
  const wrap = (client: QueryClient) => {
    const Wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    Wrapper.displayName = "QueryWrapper";
    return Wrapper;
  };

  it("reuses the cached vocabulary on remount instead of calling the API again", async () => {
    mockedApiJson.mockResolvedValue([{ id: "t1" }] as never);
    // retry off + one shared client across both mounts — mirrors the app's singleton QueryClient.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const first = renderHook(() => useQuery(tourTopicsOptions()), { wrapper: wrap(client) });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderHook(() => useQuery(tourTopicsOptions()), { wrapper: wrap(client) });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    // Served from cache — still exactly one network call across both mounts.
    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    second.unmount();

    client.clear();
  });
});
