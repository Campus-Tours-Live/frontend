import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowseByStatePage } from "@/components/universities/BrowseByStatePage";
import { StateFilterBar } from "@/components/universities/StateFilterBar";
import { StatePanel } from "@/components/universities/StatePanel";
import { US_STATES } from "@/components/universities/us-states.generated";
import { useUniversityCounts } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useUniversityCounts: jest.fn(),
}));

const mockCounts = useUniversityCounts as jest.Mock;

/** Stand-in for what Core sends. Nothing in the app holds a copy of these any more. */
const COUNTS: Record<string, number> = Object.fromEntries(
  US_STATES.map((s, i) => [s.code, s.code === "WY" ? 1 : i + 2]),
);

beforeEach(() => {
  mockCounts.mockReturnValue({
    data: { byState: COUNTS, total: 0 },
    isPending: false,
    isError: false,
  });
});

/** Every letter that begins at least one state name — B, E, J, Q, X, Y and Z begin none. */
const LIVE_LETTERS = [...new Set(US_STATES.map((s) => s.name[0]!.toUpperCase()))].sort();
const DEAD_LETTERS = ["B", "E", "J", "Q", "X", "Y", "Z"];

const rows = () => Array.from(document.querySelectorAll<HTMLElement>("li[data-state-code]"));
const PAGE_SIZE = 8;

const rowNames = () => rows().map((li) => li.textContent!.replace(/\d.*$/, "").trim());

describe("StateFilterBar", () => {
  const noop = () => {};

  /**
   * A letter with nothing behind it either wastes a control or answers with an empty list, which
   * reads as a broken page rather than as "no state starts with Q". Not rendering them removes the
   * empty state from the design entirely.
   */
  it("offers only letters that have states, plus Popular and All", () => {
    render(<StateFilterBar letters={LIVE_LETTERS} value="popular" onChange={noop} />);

    expect(screen.getAllByRole("button")).toHaveLength(LIVE_LETTERS.length + 2);
    expect(screen.getByRole("button", { name: /^Popular/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^All/ })).toBeInTheDocument();
    DEAD_LETTERS.forEach((letter) =>
      expect(screen.queryByRole("button", { name: new RegExp(`^${letter}\\b`) })).toBeNull(),
    );
  });

  /**
   * One value space for Popular, All and the letters, because they are one control: exactly one of
   * them is what the list is showing. Two controls would let a user pick two things that cannot
   * both be true.
   */
  it("marks exactly one chip as pressed, whichever kind it is", () => {
    const { rerender } = render(
      <StateFilterBar letters={LIVE_LETTERS} value="popular" onChange={noop} />,
    );
    const pressed = () =>
      screen.getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "true");

    expect(pressed()).toHaveLength(1);
    expect(pressed()[0]).toHaveAccessibleName(/^Popular/);

    rerender(<StateFilterBar letters={LIVE_LETTERS} value="M" onChange={noop} />);
    expect(pressed()).toHaveLength(1);
    expect(pressed()[0]).toHaveAccessibleName(/^M\b/);

    rerender(<StateFilterBar letters={LIVE_LETTERS} value="all" onChange={noop} />);
    expect(pressed()).toHaveLength(1);
    expect(pressed()[0]).toHaveAccessibleName(/^All/);
  });

  it("reports what was chosen", async () => {
    const onChange = jest.fn();
    render(<StateFilterBar letters={LIVE_LETTERS} value="popular" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: /^T\b/ }));
    expect(onChange).toHaveBeenCalledWith("T");

    await userEvent.click(screen.getByRole("button", { name: /^All/ }));
    expect(onChange).toHaveBeenLastCalledWith("all");
  });

  it("gives each letter a spoken purpose, not just a bare character", () => {
    render(<StateFilterBar letters={LIVE_LETTERS} value="popular" onChange={noop} />);
    expect(screen.getByRole("button", { name: "M — states starting with M" })).toBeInTheDocument();
  });
});

describe("StatePanel", () => {
  const status = () => screen.getByRole("status");

  /**
   * The page used to open on all 51 states grouped by letter, which was a long vertical scroll of
   * mostly whitespace. Opening on eight is what lets the panel stand beside the map instead of
   * running past the bottom of it.
   */
  it("opens on the popular states, not on all 51", () => {
    render(<StatePanel />);

    expect(rows()).toHaveLength(8);
    expect(status()).toHaveTextContent("Popular states");
    expect(rowNames()).toContain("California");
  });

  it("shows every state when All is chosen, a page at a time", async () => {
    render(<StatePanel />);

    await userEvent.click(screen.getByRole("button", { name: /^All/ }));

    expect(rows()).toHaveLength(PAGE_SIZE);
    expect(status()).toHaveTextContent(`1–${PAGE_SIZE} of All 51 states`);
    expect(rowNames()[0]).toBe("Alabama");
  });

  /**
   * A letter shows ONLY its own states — no letter headings, no other groups. That is the whole
   * point of the filter: the old design showed the letter's group inside all the others.
   */
  it("shows only the chosen letter's states", async () => {
    render(<StatePanel />);

    await userEvent.click(screen.getByRole("button", { name: /^M\b/ }));

    expect(rows()).toHaveLength(8);
    expect(status()).toHaveTextContent("8 states starting with M");
    expect(rowNames().every((name) => name.startsWith("M"))).toBe(true);
    expect(rowNames()).not.toContain("Texas");
  });

  /** Twelve of the nineteen letters cover one or two states — the singular has to read right. */
  it("says 'state', not 'states', when a letter covers exactly one", async () => {
    render(<StatePanel />);

    await userEvent.click(screen.getByRole("button", { name: /^F\b/ }));

    expect(rows()).toHaveLength(1);
    expect(status()).toHaveTextContent("1 state starting with F");
  });

  it("filters by name as you type", async () => {
    render(<StatePanel />);

    await userEvent.type(screen.getByRole("searchbox", { name: "Search states" }), "caro");

    expect(rowNames()).toEqual(["North Carolina", "South Carolina"]);
    expect(status()).toHaveTextContent("2 states matching");
  });

  it("matches anywhere in the name, not just the start", async () => {
    render(<StatePanel />);

    await userEvent.type(screen.getByRole("searchbox", { name: "Search states" }), "york");

    expect(rowNames()).toEqual(["New York"]);
  });

  /**
   * Search supersedes the chips, and says so by pressing NONE of them — the chips stay put.
   *
   * They used to be hidden while a query was live, which did stop a pressed chip contradicting the
   * list but took three rows of controls out of the panel: typing collapsed it by about 150px and
   * the map beside it resized. Emptying the value says the same thing without moving anything.
   */
  it("keeps the chips in place while searching, with none of them pressed", async () => {
    render(<StatePanel />);
    const box = screen.getByRole("searchbox", { name: "Search states" });
    const pressed = () =>
      screen.getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "true");

    await userEvent.click(screen.getByRole("button", { name: /^M\b/ }));
    expect(pressed()).toHaveLength(1);

    await userEvent.type(box, "ohio");
    expect(screen.getByRole("button", { name: /^M\b/ })).toBeInTheDocument();
    expect(pressed()).toHaveLength(0);
    expect(rowNames()).toEqual(["Ohio"]);

    await userEvent.clear(box);
    expect(screen.getByRole("button", { name: /^M\b/ })).toHaveAttribute("aria-pressed", "true");
    expect(rows()).toHaveLength(8);
  });

  /** …and pressing a chip is the way out of a search, rather than a control the query ignores. */
  it("clears the search when a chip is chosen", async () => {
    render(<StatePanel />);
    const box = screen.getByRole("searchbox", { name: "Search states" });

    await userEvent.type(box, "ohio");
    expect(rowNames()).toEqual(["Ohio"]);

    await userEvent.click(screen.getByRole("button", { name: /^T\b/ }));

    expect(box).toHaveValue("");
    expect(rowNames()).toEqual(["Tennessee", "Texas"]);
  });

  it("says so when nothing matches, rather than showing an empty panel", async () => {
    render(<StatePanel />);

    await userEvent.type(screen.getByRole("searchbox", { name: "Search states" }), "zzzz");

    expect(rows()).toHaveLength(0);
    expect(screen.getByText(/No state matches/)).toBeInTheDocument();
  });

  /** The counts are Core's. The guard is that the panel ASKS — never that it holds a table. */
  it("reads every count from Core", async () => {
    render(<StatePanel />);
    await userEvent.click(screen.getByRole("button", { name: /^T\b/ }));

    const texas = rows().find((li) => li.dataset.stateCode === "TX")!;
    expect(texas).toHaveTextContent(`${COUNTS.TX} universities`);
    expect(mockCounts).toHaveBeenCalled();
  });

  /** "1 universities" is the classic plural bug — Wyoming has exactly one. */
  it("pluralises the count", async () => {
    render(<StatePanel />);
    await userEvent.click(screen.getByRole("button", { name: /^W\b/ }));

    const wyoming = rows().find((li) => li.dataset.stateCode === "WY")!;
    expect(COUNTS.WY).toBe(1);
    expect(wyoming).toHaveTextContent("1 university");
    expect(wyoming.textContent).not.toMatch(/1 universities/);
  });

  /**
   * Core answers 503 rather than a map of zeros when it cannot read the directory, so that "we do
   * not know" never reaches a visitor disguised as "this state has none". The panel keeps that
   * distinction: no figure anywhere, one sentence saying why, and the states still browsable.
   */
  it("shows no figures at all — and says so — when the counts are unavailable", () => {
    mockCounts.mockReturnValue({ data: undefined, isPending: false, isError: true });

    render(<StatePanel />);

    expect(rows()).toHaveLength(8);
    expect(screen.queryByText(/universit(y|ies)/)).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent(/counts are unavailable/i);
  });

  /** Loading is not zero either — a placeholder, never a figure, and no alarm. */
  it("shows no figures while the counts are still loading", () => {
    mockCounts.mockReturnValue({ data: undefined, isPending: true, isError: false });

    render(<StatePanel />);

    expect(screen.queryByText(/universit(y|ies)/)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  /** Rows are text, not controls: nothing selects, so a row that answered to Enter would lie. */
  it("makes the rows text rather than controls", async () => {
    render(<StatePanel />);
    await userEvent.click(screen.getByRole("button", { name: /^All/ }));

    // Every button on screen belongs to the filter bar or the pager — none to a row.
    const controls = screen.getAllByRole("button");
    expect(rows().every((li) => li.querySelector("button, a") === null)).toBe(true);
    expect(controls.length).toBeGreaterThan(LIVE_LETTERS.length + 2);
    expect(screen.queryByRole("link")).toBeNull();
  });

  // --- pagination -------------------------------------------------------------------------

  /** Walked with Next rather than jumped: the pager's window holds five, so the last page has no
   *  button to click until the window has slid to it. Walking is also what a reader actually does. */
  it("pages through All and reaches the last state", async () => {
    render(<StatePanel />);
    await userEvent.click(screen.getByRole("button", { name: /^All/ }));
    expect(rowNames()).toContain("Alabama");

    // 51 states at 8 a page → seven pages, the last holding three.
    const lastPage = Math.ceil(US_STATES.length / PAGE_SIZE);
    for (let i = 1; i < lastPage; i++) {
      await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    }

    expect(rows()).toHaveLength(US_STATES.length - PAGE_SIZE * (lastPage - 1));
    expect(rowNames()).toContain("Wyoming");
    expect(status()).toHaveTextContent(
      `${PAGE_SIZE * (lastPage - 1) + 1}–${US_STATES.length} of All 51 states`,
    );
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  /**
   * A pager under a single page is a control that can never do anything. Only All and a broad
   * search reach a second page; Popular and every letter but M and N fit on one.
   */
  it("shows no pager when everything fits on one page", async () => {
    render(<StatePanel />);
    expect(screen.queryByRole("navigation", { name: /pagination/i })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /^M\b/ }));
    expect(rows()).toHaveLength(8);
    expect(screen.queryByRole("navigation", { name: /pagination/i })).toBeNull();
  });

  /**
   * The pager has to fit the panel it lives in — 320px beside the map, so 280px inside. The parts
   * are fixed widths, so this is arithmetic: five numbers is 424px, three is 300px (which wrapped
   * the next-arrow onto its own line), two is 254px. Anything that widens it again has to come with
   * a wider panel.
   */
  it("keeps the pager narrow enough to sit inside the panel", async () => {
    render(<StatePanel />);
    await userEvent.click(screen.getByRole("button", { name: /^All/ }));

    const pager = screen.getByRole("navigation", { name: /pagination/i });
    const numbers = within(pager)
      .getAllByRole("button")
      .filter((b) => /^Go to page/.test(b.getAttribute("aria-label")!));

    expect(numbers).toHaveLength(2);
    // …but the last page is still told, or "‹ 1 2 3 ›" gives no clue whether there are four pages
    // or forty. It wraps to a second line in the narrowest panel rather than overflowing.
    expect(pager.textContent).toContain("…");
    expect(pager).toHaveTextContent(String(Math.ceil(51 / PAGE_SIZE)));
  });

  /**
   * Changing the filter starts again at page one. Keeping it would let a click on "M" land on
   * nothing at all: M has one page, and you were on the fourth.
   */
  it("returns to the first page when the filter changes", async () => {
    render(<StatePanel />);
    await userEvent.click(screen.getByRole("button", { name: /^All/ }));

    // Walked with Next: the pager's window is deliberately narrow enough to fit the panel, so far
    // pages have no button until the window has slid to them.
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(rowNames()).not.toContain("Alabama");

    await userEvent.click(screen.getByRole("button", { name: /^M\b/ }));
    expect(rows()).toHaveLength(8);
    expect(rowNames()).toContain("Maine");

    // …and back to All lands on page one, not the third page it was left on.
    await userEvent.click(screen.getByRole("button", { name: /^All/ }));
    expect(rowNames()).toContain("Alabama");
  });

  /** Same reasoning for typing: a query that matches three states must not open on page four. */
  it("returns to the first page when the search changes", async () => {
    render(<StatePanel />);
    await userEvent.click(screen.getByRole("button", { name: /^All/ }));
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));

    await userEvent.type(screen.getByRole("searchbox", { name: "Search states" }), "new");

    expect(rowNames()[0]).toBe("New Hampshire");
    expect(screen.queryByRole("navigation", { name: /pagination/i })).toBeNull();
  });
});

describe("BrowseByStatePage", () => {
  /**
   * The heading says what is here and why, not how to work the controls. An earlier version read
   * "Select a state on the map, or search and browse the list" — three widgets a visitor can
   * already see, and no word about what is behind them. Both nouns are the point: universities AND
   * the student-led tours are the reason to browse by state at all.
   */
  it("says what the page is for, not just how to use it", () => {
    render(<BrowseByStatePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /find universities and campus tours by state/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/browse by state/i)).toBeInTheDocument();

    const lead = screen.getByText(/explore universities across the u\.s\./i);
    expect(lead).toHaveTextContent(/live campus tours led by current students/i);
    expect(lead).toHaveTextContent(
      /search for a state, browse the list, or select one on the map/i,
    );
  });

  /**
   * The hero illustration is DECORATIVE. It repeats what the heading beside it says, so an empty
   * `alt` is what stops a screen reader hearing the same thing twice — and the intrinsic size is
   * what stops the band reflowing when the image lands.
   */
  it("carries a decorative hero illustration", () => {
    const { container } = render(<BrowseByStatePage />);

    const hero = container.querySelector('img[src*="hero_browse_by_state"]') as HTMLImageElement;
    expect(hero).not.toBeNull();
    expect(hero.getAttribute("alt")).toBe("");
    // Not announced: an empty alt makes it presentational, so it must not surface as an image.
    expect(screen.queryByRole("img", { name: /browse|state|campus/i })).toBeNull();
  });

  /**
   * ONE task, one heading, one place to pick a state.
   *
   * The page used to carry a state list, the map, and a SECOND "Popular states" row of image cards
   * below it — the same eight state names twice, with the map in between. This is the guard against
   * that returning: only the page's own h1, no section headings, and California appearing exactly
   * once.
   */
  it("offers exactly one place to pick a state", () => {
    render(<BrowseByStatePage />);

    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    expect(screen.getByRole("group", { name: /map of the united states/i })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search states" })).toBeInTheDocument();

    // California is in the panel once, and nowhere else. (The map carries it as a shape with an
    // accessible name, not as text — hence the row query rather than a text query.)
    const californiaCards = rows().filter((li) => li.dataset.stateCode === "CA");
    expect(californiaCards).toHaveLength(1);
    expect(californiaCards[0]).toHaveTextContent(`${COUNTS.CA} universities`);
  });

  /**
   * No map below `sm`, and no control offering one.
   *
   * A map is a pointing device, and pointing at Rhode Island through a 390px viewport is not
   * something anyone does — the states there are a few pixels across. It was briefly offered behind
   * a "Show map" toggle, which was worse than either answer: it spent a control and the payoff was
   * a map you still could not use.
   *
   * Asserted on the class because the class IS the mechanism — there is no JS state left to query,
   * and jsdom applies no stylesheet, so nothing else here can tell hidden from shown.
   */
  it("does not offer a map on a phone", () => {
    const { container } = render(<BrowseByStatePage />);

    expect(screen.queryByRole("button", { name: /show map|hide map/i })).toBeNull();

    const mapColumn = container.querySelector("svg[role='group']")!.closest("div.hidden");
    expect(mapColumn).not.toBeNull();
    expect(mapColumn).toHaveClass("hidden", "sm:block");
  });
});
