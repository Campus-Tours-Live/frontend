import { useRef } from "react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  HeaderSearchBar,
  HeaderSearchMobile,
  HeaderSearchPill,
} from "@/components/site/SiteHeaderSearch";
import { useHeaderSearch } from "@/components/site/useHeaderSearch";

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

// Queue rAF callbacks and flush them after the scroll handler returns (mirrors real async
// ordering so the scroll hook's frame guard clears between scrolls), inside one act().
let rafQueue: FrameRequestCallback[] = [];

function setScroll(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true, writable: true });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
    const queued = rafQueue;
    rafQueue = [];
    queued.forEach((cb) => cb(0));
  });
}

/**
 * Minimal stand-in for SiteHeader's two-tier layout: the same `useHeaderSearch()` instance
 * drives the row-1 desktop pill (shown only while collapsed), the row-1 mobile pill + sheet
 * (always present), and the row-2 expanded band (shown by default, hidden while collapsed) —
 * without pulling in HeaderNav/MobileNav (and their own data dependencies), which this suite
 * doesn't exercise.
 */
function TestHeader() {
  const state = useHeaderSearch();
  const uniRef = useRef<HTMLInputElement>(null);
  return (
    <>
      {state.collapsed ? <HeaderSearchPill search={state} /> : null}
      <HeaderSearchMobile search={state} />
      {!state.collapsed ? <HeaderSearchBar search={state} universityInputRef={uniRef} /> : null}
    </>
  );
}

beforeEach(() => {
  rafQueue = [];
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = (() => {}) as typeof window.cancelAnimationFrame;

  push.mockClear();
  replace.mockClear();
  pathname = "/";
  search = "";
  localStorage.clear();
  setScroll(0);
});

describe("SiteHeaderSearch (two-tier: band + pill sharing useHeaderSearch)", () => {
  it("shows the expanded bar by default at the top of the page (no click needed)", () => {
    render(<TestHeader />);
    const form = within(screen.getByRole("search"));
    expect(form.getByLabelText("University")).toBeEnabled();
    expect(form.getByLabelText("Topic")).toBeEnabled();
    expect(form.getByText("Soon")).toBeInTheDocument();
    // The compact pill hasn't appeared yet — nothing has scrolled.
    expect(screen.queryByRole("button", { name: "Edit search" })).not.toBeInTheDocument();
  });

  it("shows the expanded bar by default on /tours too (this used to default to the compact pill)", () => {
    pathname = "/tours";
    render(<TestHeader />);
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit search" })).not.toBeInTheDocument();
  });

  it("collapses the band to a compact pill once scrolled past the threshold, on every page", () => {
    pathname = "/tours";
    render(<TestHeader />);
    expect(screen.getByRole("search")).toBeInTheDocument();

    setScroll(120);
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit search" })).toBeInTheDocument();

    setScroll(0);
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("clicking the compact pill re-expands the band to edit", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    setScroll(120);
    await user.click(screen.getByRole("button", { name: "Edit search" }));
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("stays expanded while a search field is focused, even when scrolled", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(within(screen.getByRole("search")).getByLabelText("University"));
    setScroll(200);
    // Interaction lock (focus) overrides scroll intent → band stays, pill never appears.
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit search" })).not.toBeInTheDocument();
  });

  it("navigates to /tours with q and topic on submit off /tours", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    const form = within(screen.getByRole("search"));
    await user.type(form.getByLabelText("University"), "Berkeley");
    await user.selectOptions(form.getByLabelText("Topic"), "DORM_HOUSING");
    await user.click(form.getByRole("button", { name: "Search" }));
    expect(push).toHaveBeenCalledWith("/tours?q=Berkeley&topic=DORM_HOUSING");
  });

  it("replaces the URL (no scroll) when already on /tours", async () => {
    pathname = "/tours";
    const user = userEvent.setup();
    render(<TestHeader />);
    const form = within(screen.getByRole("search"));
    await user.type(form.getByLabelText("University"), "MIT");
    await user.click(form.getByRole("button", { name: "Search" }));
    expect(replace).toHaveBeenCalledWith("/tours?q=MIT", { scroll: false });
    expect(push).not.toHaveBeenCalled();
  });

  it("preserves existing sort (and other params) when searching from /tours", async () => {
    pathname = "/tours";
    search = "sort=RATING&topic=DORM_HOUSING";
    const user = userEvent.setup();
    render(<TestHeader />);
    const form = screen.getByRole("search");
    await user.type(within(form).getByLabelText("University"), "MIT");
    await user.click(within(form).getByRole("button", { name: "Search" }));
    const url = (replace.mock.calls.at(-1) ?? [])[0] as string;
    expect(url).toContain("sort=RATING");
    expect(url).toContain("q=MIT");
    expect(url).toContain("topic=DORM_HOUSING");
    expect(url).not.toContain("page=");
  });

  it("shows typeahead suggestions and fills the input when one is chosen", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    const input = within(screen.getByRole("search")).getByLabelText("University");
    await user.type(input, "Stanford");
    const option = await screen.findByRole("option", { name: "Stanford University" });
    await user.click(option);
    expect(input).toHaveValue("Stanford University");
  });

  it("shows recent searches on an empty input and fills the field when one is chosen", async () => {
    localStorage.setItem("cttl:recent-universities", JSON.stringify(["Harvard", "Yale"]));
    const user = userEvent.setup();
    render(<TestHeader />);
    const form = within(screen.getByRole("search"));
    await user.click(form.getByLabelText("University"));
    expect(screen.getByText("Recent searches")).toBeInTheDocument();
    const option = await screen.findByRole("option", { name: "Harvard" });
    await user.click(option);
    expect(form.getByLabelText("University")).toHaveValue("Harvard");
  });

  it("opens a mobile sheet from the pill and searches from it", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(screen.getByRole("button", { name: "Search tours" }));
    const sheet = screen.getByRole("dialog", { name: "Search tours" });
    await user.type(within(sheet).getByLabelText("University"), "Yale");
    await user.click(within(sheet).getByRole("button", { name: "Search" }));
    expect(push).toHaveBeenCalledWith("/tours?q=Yale");
  });
});
