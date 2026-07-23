import { useEffect, useRef } from "react";
import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
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

// Mutable knobs the tests below flip to reach branches the default fixtures never hit: an
// in-flight fetch (loading state), a live search with zero matches / no data yet, and an
// empty/not-yet-loaded topic vocab.
let uniFetching = false;
let uniNoResults = false;
let uniMatchesUndefined = false;
// When true, the mocked match's name is the query VERBATIM (no "— City, ST"-style suffix) so a
// suggestion row can be the current query's exact match — the row's `active` (highlighted) state.
let uniExactMatch = false;
let topicVocab: { value: string; label: string }[] | undefined = [
  { value: "GENERAL_CAMPUS", label: "Campus life" },
  { value: "DORM_HOUSING", label: "Dorms & housing" },
  { value: "DINING_STUDENT_LIFE", label: "Dining & student life" },
];

jest.mock("@/lib/data-access", () => {
  const { canonicalizeTopicIds } = jest.requireActual("@/lib/data-access/topics");
  return {
    canonicalizeTopicIds,
    useTourTopics: () => ({
      // Three options so a two-topic selection is a genuine SUBSET of the vocab — selecting every
      // option is exercised separately (see "selecting every option…") to hit the canonical
      // full-set→[] collapse (`canonicalizeTopicIds`), which two-of-three must NOT trigger.
      data: topicVocab,
    }),
    useUniversitySearch: (q: string, opts?: { enabled?: boolean }) => ({
      // Mirrors TanStack Query: `data` is `undefined` before the first result lands (e.g. the
      // enabled/loading window), not `[]` — the hook's `matches ?? []` fallback exists for that.
      data: uniMatchesUndefined
        ? undefined
        : q.trim() && opts?.enabled
          ? uniNoResults
            ? []
            : [{ id: "u1", name: uniExactMatch ? q : `${q} University` }]
          : [],
      isFetching: uniFetching,
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
  uniFetching = false;
  uniNoResults = false;
  uniMatchesUndefined = false;
  uniExactMatch = false;
  topicVocab = [
    { value: "GENERAL_CAMPUS", label: "Campus life" },
    { value: "DORM_HOUSING", label: "Dorms & housing" },
    { value: "DINING_STUDENT_LIFE", label: "Dining & student life" },
  ];
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

  it("closes the Topic panel when focus leaves to blank space (null relatedTarget)", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Topic" }));
    const list = await screen.findByRole("listbox", { name: "Topics" });
    // Clicking a blank part of the header moves focus to <body> → focusout with a null relatedTarget.
    fireEvent.focusOut(list, { relatedTarget: null });
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

  it("shows an inline ✕ only when the University field has content, and clearing empties it without firing the API", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    const form = within(screen.getByRole("search"));
    const input = form.getByLabelText("University");
    // Empty field → no clear affordance.
    expect(form.queryByRole("button", { name: "Clear university" })).not.toBeInTheDocument();
    await user.type(input, "Stanford");
    expect(await screen.findByRole("option", { name: "Stanford University" })).toBeInTheDocument();
    // ✕ appears with content; clicking it empties the field and removes itself again.
    await user.click(form.getByRole("button", { name: "Clear university" }));
    expect(input).toHaveValue("");
    expect(form.queryByRole("button", { name: "Clear university" })).not.toBeInTheDocument();
    // The now-empty field does not fire the schools API (no results / "No schools found").
    expect(screen.queryByRole("option", { name: "Stanford University" })).not.toBeInTheDocument();
    expect(screen.queryByText("No schools found")).not.toBeInTheDocument();
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

  it("mobile: picking a school fills the field and stays on Where (no auto-advance)", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(screen.getByRole("button", { name: "Search tours" }));
    const sheet = within(screen.getByRole("dialog", { name: "Search tours" }));
    expect(sheet.getByRole("heading", { name: "University" })).toBeInTheDocument();
    await user.type(sheet.getByLabelText("University"), "Yale");
    await user.click(await sheet.findByRole("button", { name: /Yale University/ }));
    expect(sheet.getByLabelText("University")).toHaveValue("Yale University");
    // Still on the University step — Topic is NOT auto-opened.
    expect(sheet.getByRole("heading", { name: "University" })).toBeInTheDocument();
    expect(sheet.queryByRole("heading", { name: "Topic" })).not.toBeInTheDocument();
  });

  it("mobile: a pre-filled University field shows recent/Nearby, not 'No schools found'", async () => {
    pathname = "/tours";
    search = "q=Harvard";
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(screen.getByRole("button", { name: "Harvard" })); // the pill shows the committed q
    const sheet = within(screen.getByRole("dialog", { name: "Search tours" }));
    expect(sheet.getByLabelText("University")).toHaveValue("Harvard");
    // Not actively editing → no results/no-results state; show Suggested (Nearby) instead.
    expect(sheet.queryByText("No schools found")).not.toBeInTheDocument();
    expect(sheet.getByText(/Nearby/)).toBeInTheDocument();
  });

  it("clicking the compact round search icon (collapsed state) opens the University section", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    setScroll(120);
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open search" }));
    // openSection('university') expanded the band (collapsed was true → forceExpanded).
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("clicking Nearby with no recent history clears the query and keeps the panel open", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    const form = within(screen.getByRole("search"));
    await user.click(form.getByLabelText("University"));
    const panel = within(await screen.findByRole("region", { name: "University search" }));
    // No recent history → only the Nearby shortcut, no "Recent searches" heading.
    expect(panel.queryByText("Recent searches")).not.toBeInTheDocument();
    await user.click(panel.getByRole("button", { name: /Nearby/ }));
    expect(form.getByLabelText("University")).toHaveValue("");
    expect(screen.getByRole("region", { name: "University search" })).toBeInTheDocument();
  });

  it("Home/End/ArrowUp move the Topic active option (full keyboard contract)", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Topic" }));
    const list = await screen.findByRole("listbox", { name: "Topics" });

    // End → jumps to the last option.
    await user.keyboard("{End}{Enter}");
    expect(within(list).getByRole("option", { name: "Dining & student life" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // ArrowUp → moves back one, to the middle option.
    await user.keyboard("{ArrowUp}{Enter}");
    expect(within(list).getByRole("option", { name: "Dorms & housing" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Home → jumps back to the first option.
    await user.keyboard("{Home}{Enter}");
    expect(within(list).getByRole("option", { name: "Campus life" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("mobile: closes the sheet via the header Close control", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(screen.getByRole("button", { name: "Search tours" }));
    expect(screen.getByRole("dialog", { name: "Search tours" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Search tours" })).not.toBeInTheDocument();
  });

  it("mobile: 'Clear all' resets the University draft (and topics)", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(screen.getByRole("button", { name: "Search tours" }));
    const sheet = within(screen.getByRole("dialog", { name: "Search tours" }));
    await user.type(sheet.getByLabelText("University"), "Yale");
    expect(sheet.getByLabelText("University")).toHaveValue("Yale");
    await user.click(sheet.getByRole("button", { name: "Clear all" }));
    expect(sheet.getByLabelText("University")).toHaveValue("");
  });

  it("mobile: the inline Clear university (✕) button empties the field", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(screen.getByRole("button", { name: "Search tours" }));
    const sheet = within(screen.getByRole("dialog", { name: "Search tours" }));
    const input = sheet.getByLabelText("University");
    await user.type(input, "Yale");
    await user.click(sheet.getByRole("button", { name: "Clear university" }));
    expect(input).toHaveValue("");
  });

  it("mobile: a recent-search row (Clock icon list) fills the field", async () => {
    localStorage.setItem("cttl:recent-universities", JSON.stringify(["Harvard", "Yale"]));
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(screen.getByRole("button", { name: "Search tours" }));
    const sheet = within(screen.getByRole("dialog", { name: "Search tours" }));
    expect(sheet.getByText("Recent searches")).toBeInTheDocument();
    await user.click(sheet.getByRole("button", { name: "Harvard" }));
    expect(sheet.getByLabelText("University")).toHaveValue("Harvard");
  });

  it("mobile: the Suggested Nearby row (no recents) clears the query", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(screen.getByRole("button", { name: "Search tours" }));
    const sheet = within(screen.getByRole("dialog", { name: "Search tours" }));
    expect(sheet.getByText("Suggested")).toBeInTheDocument();
    expect(sheet.queryByText("Recent searches")).not.toBeInTheDocument();
    const input = sheet.getByLabelText("University");
    await user.click(sheet.getByRole("button", { name: /Nearby/ }));
    expect(input).toHaveValue("");
  });

  it("mobile: switching to the Topic card (accordion), toggling options + All topics, then back to University", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(screen.getByRole("button", { name: "Search tours" }));
    const sheet = within(screen.getByRole("dialog", { name: "Search tours" }));
    expect(sheet.getByRole("heading", { name: "University" })).toBeInTheDocument();

    // Topic starts as a collapsed summary row; tapping it expands the Topic card and collapses
    // University to its own summary row (exactly one section is a card at a time).
    await user.click(sheet.getByRole("button", { name: /^Topic/ }));
    expect(sheet.getByRole("heading", { name: "Topic" })).toBeInTheDocument();
    expect(sheet.queryByRole("heading", { name: "University" })).not.toBeInTheDocument();

    const opt = sheet.getByRole("option", { name: "Campus life" });
    await user.click(opt);
    expect(opt).toHaveAttribute("aria-selected", "true");

    await user.click(sheet.getByRole("button", { name: "All topics" }));
    expect(opt).toHaveAttribute("aria-selected", "false");

    // Tap the University collapsed row to switch the accordion back.
    await user.click(sheet.getByRole("button", { name: /^University/ }));
    expect(sheet.getByRole("heading", { name: "University" })).toBeInTheDocument();
    expect(sheet.queryByRole("heading", { name: "Topic" })).not.toBeInTheDocument();
  });

  it("shows a 'Searching…' state while the live University fetch is in flight", async () => {
    uniFetching = true;
    const user = userEvent.setup();
    render(<TestHeader />);
    const input = within(screen.getByRole("search")).getByLabelText("University");
    await user.type(input, "Stanford");
    expect(await screen.findByText("Searching…")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("shows 'No schools found' when the live University search returns zero matches (desktop)", async () => {
    uniNoResults = true;
    const user = userEvent.setup();
    render(<TestHeader />);
    const input = within(screen.getByRole("search")).getByLabelText("University");
    await user.type(input, "Zzz");
    expect(await screen.findByText("No schools found")).toBeInTheDocument();
    expect(
      screen.queryByRole("listbox", { name: "University suggestions" }),
    ).not.toBeInTheDocument();
  });

  it("mobile: shows 'No schools found' when the live University search returns zero matches", async () => {
    uniNoResults = true;
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(screen.getByRole("button", { name: "Search tours" }));
    const sheet = within(screen.getByRole("dialog", { name: "Search tours" }));
    await user.type(sheet.getByLabelText("University"), "Zzz");
    expect(await sheet.findByText("No schools found")).toBeInTheDocument();
  });

  it("topic index clamp effect resets an out-of-range active index when the vocab shrinks", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TestHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Topic" }));
    const list = await screen.findByRole("listbox", { name: "Topics" });
    // Move the active index to the last option (index 2) without selecting it.
    await user.keyboard("{End}");
    expect(list).toHaveAttribute("aria-activedescendant", "topic-opt-DINING_STUDENT_LIFE");

    // The vocabulary shrinks to a single topic — the previously active index (2) is now past the
    // new end, so the clamp effect's `i > topicOptions.length - 1` arm must reset it to 0.
    topicVocab = [{ value: "GENERAL_CAMPUS", label: "Campus life" }];
    rerender(<TestHeader />);

    expect(list).toHaveAttribute("aria-activedescendant", "topic-opt-GENERAL_CAMPUS");
  });

  it("Topic keyboard nav is a no-op guard when the topic vocabulary hasn't loaded yet", async () => {
    // `data: undefined` (not yet loaded) — exercises the hook's `topics ?? []` fallback, distinct
    // from an explicit empty array.
    topicVocab = undefined;
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Topic" }));
    const list = await screen.findByRole("listbox", { name: "Topics" });
    expect(list).not.toHaveAttribute("aria-activedescendant");
    // No options to move through or toggle — the empty-options guard returns early, no crash.
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("region", { name: "Topic" })).toBeInTheDocument();
    expect(within(list).queryAllByRole("option")).toHaveLength(0);
  });

  it("committing an empty search from the homepage still navigates to bare /tours (no query string)", async () => {
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Search" }));
    expect(push).toHaveBeenCalledWith("/tours");
  });

  it("committing an empty search while already on /tours replaces with the bare path (no trailing '?')", async () => {
    pathname = "/tours";
    const user = userEvent.setup();
    render(<TestHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Search" }));
    expect(replace).toHaveBeenCalledWith("/tours", { scroll: false });
  });

  it("handles a live University search whose data hasn't landed yet (matches undefined, not [])", async () => {
    uniMatchesUndefined = true;
    const user = userEvent.setup();
    render(<TestHeader />);
    const input = within(screen.getByRole("search")).getByLabelText("University");
    await user.type(input, "Stanford");
    // `matches ?? []` falls back to an empty list — same observable state as zero results.
    expect(await screen.findByText("No schools found")).toBeInTheDocument();
  });

  it("highlights the University suggestion row that matches the current query exactly", async () => {
    uniExactMatch = true;
    const user = userEvent.setup();
    render(<TestHeader />);
    const input = within(screen.getByRole("search")).getByLabelText("University");
    await user.type(input, "Stanford");
    const option = await screen.findByRole("option", { name: "Stanford" });
    expect(option).toHaveAttribute("aria-selected", "true");
  });
});

describe("useHeaderSearch — hook-level branches not reachable through the shared UI shell", () => {
  it("ensureExpanded forces the header expanded without choosing a section", () => {
    const { result } = renderHook(() => useHeaderSearch());
    expect(result.current.forceExpanded).toBe(false);
    act(() => result.current.ensureExpanded());
    expect(result.current.forceExpanded).toBe(true);
    expect(result.current.activeSection).toBeNull();
  });

  it("openSection while already expanded (not collapsed) reveals the panel immediately", () => {
    const { result } = renderHook(() => useHeaderSearch());
    // Top of the page, nothing scrolled: the header starts expanded, not collapsed.
    expect(result.current.collapsed).toBe(false);
    act(() => result.current.openSection("university"));
    // The "already expanded" branch reveals the panel synchronously (no transition-end to wait for).
    expect(result.current.panelVisible).toBe(true);
    expect(result.current.activeSection).toBe("university");
  });

  it("commitSearch on /tours with an emptied query removes q (not a blank param)", () => {
    pathname = "/tours";
    search = "q=Harvard&sort=RATING";
    const { result } = renderHook(() => useHeaderSearch());
    expect(result.current.q).toBe("Harvard");
    act(() => result.current.setQ(""));
    act(() => result.current.commitSearch());
    expect(replace).toHaveBeenCalledWith("/tours?sort=RATING", { scroll: false });
  });
});
