import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/lib/data-access/QueryProvider";
import { ApiError } from "@/lib/data-access";
import { AuthCancelledError } from "@/lib/auth";

// Reaches into the shared client's default retry predicate and exercises every branch.
function Probe() {
  const client = useQueryClient();
  const retry = client.getDefaultOptions().queries!.retry as (n: number, e: Error) => boolean;
  const results = [
    retry(0, new AuthCancelledError()), // cancelled re-auth → never retry
    retry(0, new ApiError(404)), // client 4xx → never retry
    retry(0, new ApiError(500)), // server 5xx → one retry
    retry(0, new Error("network")), // transient → one retry
    retry(1, new Error("network")), // already retried once → stop
  ];
  return <div data-testid="retry">{results.join(",")}</div>;
}

describe("QueryProvider", () => {
  it("renders children under the QueryClientProvider", () => {
    render(
      <QueryProvider>
        <span>child</span>
      </QueryProvider>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("retry policy: no retry on cancel/4xx, one retry on 5xx/network", () => {
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    expect(screen.getByTestId("retry")).toHaveTextContent("false,false,true,true,false");
  });
});
