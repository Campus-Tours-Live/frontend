import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useMe } from "@/lib/data-access";

/**
 * SiteHeader owns the DOM-interaction effects (fallback focus timer, shell transitionend
 * handoff, defensive blur-on-collapse, outside pointerdown/Escape) that `useHeaderSearch` stays
 * free of. This suite renders the REAL `<SiteHeader />` (not a hand-rolled stand-in) so those
 * effects actually run, and drives them the way a user would: scroll to collapse, click a
 * compact section pill, let (or don't let) the shell's transition fire, scroll to force a
 * collapse mid-focus, click/Escape outside and inside the header.
 */

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
    useMe: jest.fn(),
    useTourTopics: () => ({
      data: [
        { value: "GENERAL_CAMPUS", label: "Campus life" },
        { value: "DORM_HOUSING", label: "Dorms & housing" },
      ],
    }),
    useUniversitySearch: (q: string, opts?: { enabled?: boolean }) => ({
      data: q.trim() && opts?.enabled ? [{ id: "u1", name: `${q} University` }] : [],
      isFetching: false,
    }),
  };
});

// Queue rAF callbacks and flush them after the scroll handler returns (mirrors real async
// ordering so the scroll hook's frame guard clears between scrolls), inside one act() —
// mirrors SiteHeaderSearch.test.tsx's convention.
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

function setupUser() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

function getShell(): HTMLElement {
  const shell = document.querySelector(".ds-shell");
  if (!shell) throw new Error("shell (.ds-shell) not found");
  return shell as HTMLElement;
}

/** jsdom (this project's test env) has no `TransitionEvent` constructor, so RTL's
 *  `fireEvent.transitionEnd` silently falls back to a plain `Event` whose init dict does NOT
 *  carry a `propertyName` (the standard `Event` constructor ignores unknown init keys) — every
 *  `handleShellTransitionEnd` call would then see `e.propertyName === undefined` and bail at its
 *  second guard regardless of what's passed. Build the event by hand and assign `propertyName`
 *  as a plain property (readable exactly like a real TransitionEvent's) so the real branch logic
 *  is actually exercised. */
function fireTransitionEnd(el: HTMLElement, propertyName: string) {
  const event = new Event("transitionend", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "propertyName", { value: propertyName, configurable: true });
  fireEvent(el, event);
}

beforeEach(() => {
  jest.useFakeTimers();

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
  (useMe as jest.Mock).mockReturnValue({ me: null, isLoading: false, isOnboarded: false });
  setScroll(0);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("SiteHeader — fallback focus timer (compact pill click without a transitionend)", () => {
  it("focuses the University input after the fallback delay when the University section was opened", async () => {
    const user = setupUser();
    render(<SiteHeader />);
    setScroll(120); // collapse to the compact pill
    await user.click(screen.getByRole("button", { name: "University" }));
    const input = within(screen.getByRole("search")).getByLabelText("University");
    expect(input).not.toHaveFocus();

    act(() => {
      jest.advanceTimersByTime(320);
    });

    expect(input).toHaveFocus();
    expect(screen.getByRole("region", { name: "University search" })).toBeInTheDocument();
  });

  it("focuses the Topic trigger after the fallback delay when the Topic section was opened", async () => {
    const focusSpy = jest.spyOn(HTMLElement.prototype, "focus");
    const user = setupUser();
    render(<SiteHeader />);
    setScroll(120);
    await user.click(screen.getByRole("button", { name: "Topic" }));
    const trigger = within(screen.getByRole("search")).getByRole("button", { name: "Topic" });
    focusSpy.mockClear();

    act(() => {
      jest.advanceTimersByTime(320);
    });

    // focusActiveSection's "topic" branch focuses the trigger — TopicSectionPanel's own "open"
    // effect then re-focuses its listbox (separate, already-tested behavior), so assert the
    // trigger was focused along the way rather than the final (superseded) activeElement.
    expect(focusSpy.mock.instances).toContain(trigger);
    expect(screen.getByRole("region", { name: "Topic" })).toBeInTheDocument();
    focusSpy.mockRestore();
  });

  it("clears the pending fallback timer when the effect is cleaned up (unmount while armed)", async () => {
    const clearSpy = jest.spyOn(global, "clearTimeout");
    const user = setupUser();
    const { unmount } = render(<SiteHeader />);
    setScroll(120);
    await user.click(screen.getByRole("button", { name: "University" }));
    clearSpy.mockClear(); // ignore any unrelated clearTimeout calls made so far

    unmount();

    expect(clearSpy).toHaveBeenCalled();
    // The (now-cleared) timer must genuinely never fire post-unmount.
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }).not.toThrow();
    clearSpy.mockRestore();
  });

  it("switching sections before the fallback fires re-arms it for the NEW section (old timer cleared, not stale-fired)", async () => {
    const user = setupUser();
    render(<SiteHeader />);
    setScroll(120);
    await user.click(screen.getByRole("button", { name: "University" })); // openSection("university")

    act(() => {
      jest.advanceTimersByTime(100); // well under 320ms — the University fallback is still pending
    });

    const form = within(screen.getByRole("search"));
    const uniInput = form.getByLabelText("University");
    // Changes their mind: clicks Topic in the now-expanded form (enterSection, not openSection) —
    // pendingFocus is untouched (still true) but activeSection flips, so focusActiveSection's
    // identity changes and the fallback effect re-arms.
    await user.click(form.getByRole("button", { name: "Topic" }));
    const topicTrigger = form.getByRole("button", { name: "Topic" });

    // The ORIGINAL (University) timer would have fired 220ms from here (320ms total) — if the
    // cleanup hadn't cancelled it, University would wrongly steal focus back from Topic.
    act(() => {
      jest.advanceTimersByTime(220);
    });
    expect(uniInput).not.toHaveFocus();
    expect(topicTrigger).not.toHaveFocus();

    // The RESTARTED timer (armed the moment activeSection became "topic") fires 320ms after that.
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(topicTrigger).toHaveFocus();
    expect(uniInput).not.toHaveFocus();
  });
});

describe("SiteHeader — shell transitionend focus handoff", () => {
  it("ignores a transitionend whose target is a descendant, not the shell itself", async () => {
    const user = setupUser();
    render(<SiteHeader />);
    setScroll(120);
    await user.click(screen.getByRole("button", { name: "University" }));
    const input = within(screen.getByRole("search")).getByLabelText("University");

    fireTransitionEnd(input, "width");
    expect(input).not.toHaveFocus(); // ignored — e.target (input) !== e.currentTarget (shell)

    // The pending fallback is untouched by the ignored event — it still fires normally.
    act(() => {
      jest.advanceTimersByTime(320);
    });
    expect(input).toHaveFocus();
  });

  it("ignores a transitionend on the shell for a property other than width", async () => {
    const user = setupUser();
    render(<SiteHeader />);
    setScroll(120);
    await user.click(screen.getByRole("button", { name: "University" }));
    const input = within(screen.getByRole("search")).getByLabelText("University");

    fireTransitionEnd(getShell(), "opacity");
    expect(input).not.toHaveFocus(); // ignored — wrong propertyName

    act(() => {
      jest.advanceTimersByTime(320);
    });
    expect(input).toHaveFocus();
  });

  it("ignores a width transitionend on the shell when there is no pending focus request", () => {
    render(<SiteHeader />);
    // Top of page: expanded by default, but no section was opened via a click — pendingFocus is
    // false, so a stray width transitionend (e.g. an unrelated resize) is a no-op.
    const before = document.activeElement;

    expect(() => fireTransitionEnd(getShell(), "width")).not.toThrow();

    expect(document.activeElement).toBe(before);
  });

  it("on a genuine width transitionend while expanding with a pending focus, focuses the section and cancels the fallback timer", async () => {
    const clearSpy = jest.spyOn(global, "clearTimeout");
    const user = setupUser();
    render(<SiteHeader />);
    setScroll(120);
    await user.click(screen.getByRole("button", { name: "University" }));
    const input = within(screen.getByRole("search")).getByLabelText("University");
    expect(input).not.toHaveFocus();
    clearSpy.mockClear();

    fireTransitionEnd(getShell(), "width");

    expect(input).toHaveFocus();
    expect(screen.getByRole("region", { name: "University search" })).toBeInTheDocument();
    expect(clearSpy).toHaveBeenCalled(); // the now-redundant fallback timer was cancelled

    // The (cancelled) fallback timer must not fire again / change anything later.
    act(() => {
      jest.advanceTimersByTime(320);
    });
    expect(input).toHaveFocus();
    clearSpy.mockRestore();
  });

  it("a Topic transitionend focuses the Topic trigger via focusActiveSection (TopicSectionPanel's own effect then hands focus to its listbox)", async () => {
    const focusSpy = jest.spyOn(HTMLElement.prototype, "focus");
    const user = setupUser();
    render(<SiteHeader />);
    setScroll(120);
    await user.click(screen.getByRole("button", { name: "Topic" }));
    const trigger = within(screen.getByRole("search")).getByRole("button", { name: "Topic" });
    focusSpy.mockClear();

    fireTransitionEnd(getShell(), "width");

    // handleShellTransitionEnd's focusActiveSection() call does focus the Topic trigger — even
    // though TopicSectionPanel's own "open" effect immediately re-focuses its listbox afterward
    // (a separate, real, already-tested behavior), the trigger must have been focused along the
    // way, proving the "topic" branch of focusActiveSection actually ran.
    expect(focusSpy.mock.instances).toContain(trigger);
    expect(screen.getByRole("region", { name: "Topic" })).toBeInTheDocument();
    focusSpy.mockRestore();
  });
});

describe("SiteHeader — defensive blur when a scroll-forced collapse strands focus", () => {
  it("blurs a still-focused University input inside the header once collapsed flips true", async () => {
    const user = setupUser();
    render(<SiteHeader />);
    const input = within(screen.getByRole("search")).getByLabelText("University");
    await user.click(input);
    expect(input).toHaveFocus();

    // A fresh, clear downward scroll overrides the focus soft-lock and collapses the header —
    // useHeaderSearch resets searchFocusWithin etc, but that state reset does NOT itself touch
    // the real DOM focus. This effect is the defensive backstop that blurs it once `collapsed`
    // actually flips true.
    setScroll(200);

    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(input).not.toHaveFocus();
  });
});

describe("SiteHeader — outside pointerdown / Escape end the interaction", () => {
  it("a pointerdown outside the header ends the interaction and closes an open panel", async () => {
    const user = setupUser();
    render(<SiteHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Topic" }));
    expect(screen.getByRole("region", { name: "Topic" })).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("region", { name: "Topic" })).not.toBeInTheDocument();
  });

  it("a pointerdown inside the header does not end the interaction", async () => {
    const user = setupUser();
    render(<SiteHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Topic" }));
    expect(screen.getByRole("region", { name: "Topic" })).toBeInTheDocument();

    // Raw pointerdown on an unrelated header element (not the Topic panel) — isolates the
    // document-level listener's `headerRef.contains(target)` early return from any descendant
    // component's OWN onBlur-close behavior (e.g. the panel closing because focus itself moved).
    fireEvent.pointerDown(screen.getByRole("link", { name: "CampusToursLive.ai home" }));

    expect(screen.getByRole("region", { name: "Topic" })).toBeInTheDocument();
  });

  it("Escape blurs the focused control inside the header, closes the panel, and returns focus to the Topic trigger", async () => {
    const user = setupUser();
    render(<SiteHeader />);
    const trigger = within(screen.getByRole("search")).getByRole("button", { name: "Topic" });
    await user.click(trigger);
    const list = await screen.findByRole("listbox", { name: "Topics" });
    expect(list).toHaveFocus(); // TopicSectionPanel focuses the listbox on open

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("region", { name: "Topic" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("Escape while a fallback focus timer is still armed clears it (cancelPendingFocus clearTimeout path)", async () => {
    const user = setupUser();
    render(<SiteHeader />);
    setScroll(120);
    await user.click(screen.getByRole("button", { name: "University" }));
    const input = within(screen.getByRole("search")).getByLabelText("University");

    await user.keyboard("{Escape}"); // cancels before the 320ms fallback would have fired

    act(() => {
      jest.advanceTimersByTime(320);
    });
    // If the timer had NOT actually been cleared, University would be wrongly (re-)focused here.
    expect(input).not.toHaveFocus();
  });

  it("ignores non-Escape keys — an open panel stays open", async () => {
    const user = setupUser();
    render(<SiteHeader />);
    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Topic" }));
    await screen.findByRole("listbox", { name: "Topics" });

    await user.keyboard("a");

    expect(screen.getByRole("region", { name: "Topic" })).toBeInTheDocument();
  });
});
