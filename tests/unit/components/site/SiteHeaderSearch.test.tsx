import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteHeaderSearch } from "@/components/site/SiteHeaderSearch";

const push = jest.fn();
const replace = jest.fn();
let pathname = "/";
let search = "";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));

jest.mock("@/lib/data-access", () => ({
  useTourTopics: () => ({
    data: [
      { value: "GENERAL_CAMPUS", label: "Campus life" },
      { value: "DORM_HOUSING", label: "Dorms & housing" },
    ],
  }),
}));

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  pathname = "/";
  search = "";
});

describe("SiteHeaderSearch", () => {
  it("renders three segments with Language disabled and badged Soon", () => {
    render(<SiteHeaderSearch />);
    expect(screen.getByLabelText("University")).toBeEnabled();
    expect(screen.getByLabelText("Topic")).toBeEnabled();
    expect(screen.getByText("Soon")).toBeInTheDocument();
  });

  it("navigates to /tours with q and topic on submit off /tours", async () => {
    const user = userEvent.setup();
    render(<SiteHeaderSearch />);
    await user.type(screen.getByLabelText("University"), "Berkeley");
    await user.selectOptions(screen.getByLabelText("Topic"), "DORM_HOUSING");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(push).toHaveBeenCalledWith("/tours?q=Berkeley&topic=DORM_HOUSING");
  });

  it("replaces the URL (no scroll) when already on /tours", async () => {
    pathname = "/tours";
    const user = userEvent.setup();
    render(<SiteHeaderSearch />);
    await user.click(screen.getByRole("button", { name: "Edit search" }));
    await user.type(screen.getByLabelText("University"), "MIT");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(replace).toHaveBeenCalledWith("/tours?q=MIT", { scroll: false });
    expect(push).not.toHaveBeenCalled();
  });
});
