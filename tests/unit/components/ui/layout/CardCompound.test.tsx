import { render, screen, within } from "@testing-library/react";
import { Card } from "@/components/ui/layout/Card";
import { CardMedia } from "@/components/ui/layout/CardMedia";
import { CardHeader } from "@/components/ui/layout/CardHeader";
import { CardContent } from "@/components/ui/layout/CardContent";
import { CardActions } from "@/components/ui/layout/CardActions";

describe("Card compound", () => {
  it("composes media, header (leadingIcon/title/trailing), content, and actions", () => {
    render(
      <Card padded={false} className="overflow-hidden" data-testid="card">
        <CardMedia>
          <img alt="Kitten" src="cat.jpg" />
        </CardMedia>
        <CardHeader
          leadingIcon={<span data-testid="lead">i</span>}
          title="Welcome"
          trailing={<button type="button">Start</button>}
        />
        <CardContent>Body copy</CardContent>
        <CardActions>
          <button type="button">Action</button>
        </CardActions>
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(screen.getByRole("img", { name: "Kitten" })).toBeInTheDocument();
    // Header renders the title as a heading, plus leading + trailing.
    expect(within(card).getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
    expect(within(card).getByTestId("lead")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(within(card).getByText("Body copy")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("scales sub-component padding via the Card size context", () => {
    const { rerender } = render(
      <Card padded={false} size="small">
        <CardContent data-testid="content">x</CardContent>
      </Card>,
    );
    expect(screen.getByTestId("content")).toHaveClass("px-5", "py-4");

    rerender(
      <Card padded={false} size="large">
        <CardContent data-testid="content">x</CardContent>
      </Card>,
    );
    expect(screen.getByTestId("content")).toHaveClass("px-6", "py-5");
  });
});
