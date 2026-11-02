import { render } from "@testing-library/react";
import { SiteHeader } from "@/components/site/SiteHeader";

jest.mock("@/components/site/useHeaderSearch", () => ({
  useHeaderSearch: () => {
    throw new Promise(() => {});
  },
}));

it("reserves the header footprint while URL search parameters suspend", () => {
  const { container } = render(<SiteHeader />);
  expect(container.querySelector(".header-spacer")).toHaveAttribute("aria-hidden", "true");
});
