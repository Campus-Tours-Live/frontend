import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Banner, type BannerVariant } from "@/components/ui/feedback/Banner";

describe("Banner", () => {
  it("renders role='alert' with the message and a dismiss button", () => {
    render(<Banner onClose={jest.fn()}>Scheduled maintenance tonight</Banner>);
    const el = screen.getByRole("alert");
    expect(el).toHaveTextContent("Scheduled maintenance tonight");
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("fires onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Banner onClose={onClose}>Notice</Banner>);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["info", "alert-info"],
    ["warning", "alert-warning"],
    ["success", "alert-success"],
    ["error", "alert-error"],
  ] as [BannerVariant, string][])(
    "variant %s applies %s + a severity label",
    (variant, expected) => {
      render(
        <Banner variant={variant} onClose={jest.fn()}>
          msg
        </Banner>,
      );
      expect(screen.getByRole("alert")).toHaveClass(expected);
      expect(screen.getByText(`${variant}:`)).toHaveClass("sr-only");
    },
  );

  it("accepts a custom close label", () => {
    render(
      <Banner onClose={jest.fn()} closeLabel="Close notice">
        x
      </Banner>,
    );
    expect(screen.getByRole("button", { name: "Close notice" })).toBeInTheDocument();
  });
});
