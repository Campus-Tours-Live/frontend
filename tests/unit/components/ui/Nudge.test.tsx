import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Nudge } from "@/components/ui/Nudge";

describe("Nudge", () => {
  it("renders leading, title, body, and actions", () => {
    render(
      <Nudge
        data-testid="nudge"
        leading={<span data-testid="lead">i</span>}
        title="Finish setup"
        actions={<button type="button">Add hours</button>}
      >
        Add weekly hours so participants can book you.
      </Nudge>,
    );
    const nudge = screen.getByTestId("nudge");
    expect(within(nudge).getByTestId("lead")).toBeInTheDocument();
    expect(within(nudge).getByText("Finish setup")).toBeInTheDocument();
    expect(within(nudge).getByText(/Add weekly hours so participants/)).toBeInTheDocument();
    expect(within(nudge).getByRole("button", { name: "Add hours" })).toBeInTheDocument();
  });

  it("shows no dismiss button without onClose", () => {
    render(<Nudge title="Note">Body</Nudge>);
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });

  it("renders a dismiss button that fires onClose", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(
      <Nudge title="Note" onClose={onClose} closeLabel="Close">
        Body
      </Nudge>,
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
