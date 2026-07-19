import { useEffect, useRef } from "react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DesktopSearchShell,
  HeaderSearchMobile,
  TopicSectionPanel,
  UniversitySectionPanel,
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

jest.mock("@/lib/data-access", () => {
  const { canonicalizeTopicIds } = jest.requireActual("@/lib/data-access/topics");
  return {
    canonicalizeTopicIds,
    useTourTopics: () => ({
      // Three options so a two-topic selection is a genuine SUBSET of the vocab — selecting every
      // option is exercised separately (see "selecting every option…") to hit the canonical
      // full-set→[] collapse (`canonicalizeTopicIds`), which two-of-three must NOT trigger.
      data: [
        { value: "GENERAL_CAMPUS", label: "Campus life" },
        { value: "DORM_HOUSING", label: "Dorms & housing" },
        { value: "DINING_STUDENT_LIFE", label: "Dining & student life" },
      ],
    }),
    useUniversitySearch: (q: string, opts?: { enabled?: boolean }) => ({
      data: q.trim() && opts?.enabled ? [{ id: "u1", name: `${q} University` }] : [],
    }),
  };
});

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
  const topicRef = useRef<HTMLButtonElement>(null);
  const { activeSection, endInteraction } = state;
  // Mirrors SiteHeader's document Escape listener: close the popover (KEEP the content) and, when the
  // cancelled section was Topic, return focus to its trigger (the trigger opens on click, not focus,
  // so this programmatic focus does not re-open the panel).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const cancelledSection = activeSection;
      endInteraction();
      if (cancelledSection === "topic") topicRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeSection, endInteraction]);
  // The real header renders ONE shell (expanded form + compact section-button group cross-fading
  // inside); each layer is aria-hidden in the inactive state, so role queries resolve to the active
  // layer. Mobile is a separate control.
  return (
    <>
      <DesktopSearchShell search={state} universityInputRef={uniRef} topicRef={topicRef} />
      <UniversitySectionPanel search={state} />
      <TopicSectionPanel search={state} />
      <HeaderSearchMobile search={state} />
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
    expect(screen.getByRole("button", { name: "University" })).toBeInTheDocument();

    setScroll(0);
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("clicking a compact section button re-expands the band to edit", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    setScroll(120);
    await user.click(screen.getByRole("button", { name: "University" }));
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("opening the Topic section expands without flashing the University suggestions", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    setScroll(120);
    await user.click(screen.getByRole("button", { name: "Topic" }));
    expect(screen.getByRole("search")).toBeInTheDocument();
    // openSection('topic') must not focus University or open its suggestions.
    expect(
      screen.queryByRole("listbox", { name: "University suggestions" }),
    ).not.toBeInTheDocument();
  });

  it("lets a clear downward scroll end a focused interaction and collapse (soft lock is overridable)", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(within(screen.getByRole("search")).getByLabelText("University"));
    // Focused → expanded. A clear downward scroll (past the hook's threshold) overrides the soft
    // focus lock: the interaction ends and the header collapses to the compact control.
    setScroll(200);
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "University" })).toBeInTheDocument();
  });

  it("commits multiple selected topics as repeated params", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    const form = within(screen.getByRole("search"));
    await user.type(form.getByLabelText("University"), "Berkeley");
    await user.click(form.getByRole("button", { name: "Topic" }));
    const panel = within(await screen.findByRole("region", { name: "Topic" }));
    await user.click(panel.getByRole("option", { name: "Campus life" }));
    await user.click(panel.getByRole("option", { name: "Dorms & housing" }));
    await user.click(form.getByRole("button", { name: "Search" }));
    const url = push.mock.calls.at(-1)![0] as string;
    expect(url).toContain("q=Berkeley");
    expect(url).toContain("topic=GENERAL_CAMPUS");
    expect(url).toContain("topic=DORM_HOUSING");
  });

  it("multi-select listbox: options are multiselectable and toggle", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Topic" }));
    const list = await screen.findByRole("listbox", { name: "Topics" });
    expect(list).toHaveAttribute("aria-multiselectable", "true");
    const opt = within(list).getByRole("option", { name: "Campus life" });
    await user.click(opt);
    expect(opt).toHaveAttribute("aria-selected", "true");
    await user.click(opt);
    expect(opt).toHaveAttribute("aria-selected", "false");
  });

  it("closes the Topic panel when focus moves out of it (blur)", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Topic" }));
    expect(await screen.findByRole("region", { name: "Topic" })).toBeInTheDocument();
    // Move focus to a control outside the Topic panel → the panel closes.
    await user.click(within(screen.getByRole("search")).getByLabelText("University"));
    expect(screen.queryByRole("region", { name: "Topic" })).not.toBeInTheDocument();
  });

  it("keeps the Topic panel open while toggling options (clicks don't blur it closed)", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Topic" }));
    const list = await screen.findByRole("listbox", { name: "Topics" });
    await user.click(within(list).getByRole("option", { name: "Campus life" }));
    // Still open after a toggle.
    expect(screen.getByRole("region", { name: "Topic" })).toBeInTheDocument();
  });

  it("ArrowDown+Enter toggles the second option", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Topic" }));
    const list = await screen.findByRole("listbox", { name: "Topics" });
    await user.keyboard("{ArrowDown}{Enter}");
    const opt = within(list).getByRole("option", { name: "Dorms & housing" });
    expect(opt).toHaveAttribute("aria-selected", "true");
  });

  it("Escape closes the Topic region and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    const trigger = within(screen.getByRole("search")).getByRole("button", { name: "Topic" });
    await user.click(trigger);
    expect(await screen.findByRole("region", { name: "Topic" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "Topic" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('"All topics" control clears the selection', async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Topic" }));
    const panel = within(await screen.findByRole("region", { name: "Topic" }));
    await user.click(panel.getByRole("option", { name: "Campus life" }));
    expect(panel.getByRole("option", { name: "Campus life" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.click(panel.getByRole("button", { name: "All topics" }));
    expect(panel.getByRole("option", { name: "Campus life" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("selecting every option shows the segment summary as All topics", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    const form = within(screen.getByRole("search"));
    await user.click(form.getByRole("button", { name: "Topic" }));
    const panel = within(await screen.findByRole("region", { name: "Topic" }));
    await user.click(panel.getByRole("option", { name: "Campus life" }));
    await user.click(panel.getByRole("option", { name: "Dorms & housing" }));
    await user.click(panel.getByRole("option", { name: "Dining & student life" }));
    expect(form.getByRole("button", { name: "Topic" })).toHaveTextContent("All topics");
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

  it("commits a picked university's bare name as q (search by school name)", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    const input = within(screen.getByRole("search")).getByLabelText("University");
    await user.type(input, "Stanford");
    await user.click(await screen.findByRole("option", { name: "Stanford University" }));
    expect(input).toHaveValue("Stanford University");
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Search" }));
    const url = push.mock.calls.at(-1)![0] as string;
    expect(url).toContain("q=Stanford");
  });

  it("closes the University popover once a suggestion is chosen (no lingering results)", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    const input = within(screen.getByRole("search")).getByLabelText("University");
    await user.type(input, "Stanford");
    await user.click(await screen.findByRole("option", { name: "Stanford University" }));
    expect(input).toHaveValue("Stanford University");
    // The popover is gone — not still showing results or "No schools found".
    expect(screen.queryByRole("region", { name: "University search" })).not.toBeInTheDocument();
  });

  it("focusing a pre-filled University field opens no popover (no results / No schools found)", async () => {
    pathname = "/tours";
    search = "q=Harvard";
    const user = userEvent.setup();
    render(<TestHeader />);
    const input = within(screen.getByRole("search")).getByLabelText("University");
    expect(input).toHaveValue("Harvard");
    await user.click(input); // focus only, no edit
    expect(screen.queryByRole("region", { name: "University search" })).not.toBeInTheDocument();
    expect(screen.queryByText("No schools found")).not.toBeInTheDocument();
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
