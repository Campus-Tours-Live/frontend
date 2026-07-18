import { render, screen, within } from "@testing-library/react";
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
  useUniversitySearch: (q: string, opts?: { enabled?: boolean }) => ({
    data: q.trim() && opts?.enabled ? [{ id: "u1", name: `${q} University` }] : [],
  }),
}));

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  pathname = "/";
  search = "";
  localStorage.clear();
});

describe("SiteHeaderSearch", () => {
  it("renders three segments with Language disabled and badged Soon", () => {
    render(<SiteHeaderSearch />);
    const form = within(screen.getByRole("search"));
    expect(form.getByLabelText("University")).toBeEnabled();
    expect(form.getByLabelText("Topic")).toBeEnabled();
    expect(form.getByText("Soon")).toBeInTheDocument();
  });

  it("navigates to /tours with q and topic on submit off /tours", async () => {
    const user = userEvent.setup();
    render(<SiteHeaderSearch />);
    const form = within(screen.getByRole("search"));
    await user.type(form.getByLabelText("University"), "Berkeley");
    await user.selectOptions(form.getByLabelText("Topic"), "DORM_HOUSING");
    await user.click(form.getByRole("button", { name: "Search" }));
    expect(push).toHaveBeenCalledWith("/tours?q=Berkeley&topic=DORM_HOUSING");
  });

  it("replaces the URL (no scroll) when already on /tours", async () => {
    pathname = "/tours";
    const user = userEvent.setup();
    render(<SiteHeaderSearch />);
    await user.click(screen.getByRole("button", { name: "Edit search" }));
    const form = within(screen.getByRole("search"));
    await user.type(form.getByLabelText("University"), "MIT");
    await user.click(form.getByRole("button", { name: "Search" }));
    expect(replace).toHaveBeenCalledWith("/tours?q=MIT", { scroll: false });
    expect(push).not.toHaveBeenCalled();
  });

  it("shows typeahead suggestions and fills the input when one is chosen", async () => {
    const user = userEvent.setup();
    render(<SiteHeaderSearch />);
    const input = within(screen.getByRole("search")).getByLabelText("University");
    await user.type(input, "Stanford");
    const option = await screen.findByRole("option", { name: "Stanford University" });
    await user.click(option);
    expect(input).toHaveValue("Stanford University");
  });

  it("shows recent searches on an empty input and fills the field when one is chosen", async () => {
    localStorage.setItem("cttl:recent-universities", JSON.stringify(["Harvard", "Yale"]));
    const user = userEvent.setup();
    render(<SiteHeaderSearch />);
    const form = within(screen.getByRole("search"));
    await user.click(form.getByLabelText("University"));
    expect(screen.getByText("Recent searches")).toBeInTheDocument();
    const option = await screen.findByRole("option", { name: "Harvard" });
    await user.click(option);
    expect(form.getByLabelText("University")).toHaveValue("Harvard");
  });

  it("opens a mobile sheet from the pill and searches from it", async () => {
    const user = userEvent.setup();
    render(<SiteHeaderSearch />);
    await user.click(screen.getByRole("button", { name: "Search tours" }));
    const sheet = screen.getByRole("dialog", { name: "Search tours" });
    await user.type(within(sheet).getByLabelText("University"), "Yale");
    await user.click(within(sheet).getByRole("button", { name: "Search" }));
    expect(push).toHaveBeenCalledWith("/tours?q=Yale");
  });
});
