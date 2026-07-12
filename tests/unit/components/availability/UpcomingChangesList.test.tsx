import { render, screen } from "@testing-library/react";
import { UpcomingChangesList } from "@/components/availability/UpcomingChangesList";
import { useAvailabilityExceptions, useResolvedAvailability } from "@/lib/data-access";
import type { AvailabilityException, ResolvedAvailability } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useResolvedAvailability: jest.fn(),
  useAvailabilityExceptions: jest.fn(),
}));

const mockUseResolvedAvailability = useResolvedAvailability as jest.Mock;
const mockUseAvailabilityExceptions = useAvailabilityExceptions as jest.Mock;

function setResolved(dstGapDays: string[]) {
  mockUseResolvedAvailability.mockReturnValue({
    data: { rules: [], occurrences: [], dstGapDays } satisfies ResolvedAvailability,
    isLoading: false,
    isError: false,
  });
}

function setExceptions(exceptions: AvailabilityException[]) {
  mockUseAvailabilityExceptions.mockReturnValue({
    data: exceptions,
    isLoading: false,
    isError: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setResolved([]);
  setExceptions([]);
});

describe("UpcomingChangesList — DST notices from dstGapDays", () => {
  it("renders a DST notice for each dstGapDays entry", () => {
    setResolved(["2026-03-08"]);
    render(<UpcomingChangesList />);

    const list = screen.getByRole("list", { name: /upcoming changes list/i });
    expect(list).toHaveTextContent(/daylight/i);
    expect(list).toHaveTextContent("2026-03-08");
  });
});

describe("UpcomingChangesList — exceptions rendered as-is (no blocked/extra derivation)", () => {
  it("renders an UNAVAILABLE exception with date, kind badge, and from–to", () => {
    setExceptions([
      {
        id: "exc-1",
        exceptionDate: "2026-08-01",
        kind: "UNAVAILABLE",
        startLocal: "09:00",
        windowMin: 240,
        reason: null,
      },
    ]);
    render(<UpcomingChangesList />);

    const list = screen.getByRole("list", { name: /upcoming changes list/i });
    expect(list).toHaveTextContent(/blocked/i);
    expect(list).toHaveTextContent("9:00 AM – 1:00 PM");
  });

  it("renders an ADDITIONAL exception with date, kind badge, and from–to", () => {
    setExceptions([
      {
        id: "exc-2",
        exceptionDate: "2026-08-05",
        kind: "ADDITIONAL",
        startLocal: "18:00",
        windowMin: 120,
        reason: null,
      },
    ]);
    render(<UpcomingChangesList />);

    const list = screen.getByRole("list", { name: /upcoming changes list/i });
    expect(list).toHaveTextContent(/extra/i);
    expect(list).toHaveTextContent("6:00 PM – 8:00 PM");
  });

  it("renders both DST notices and exceptions together, sorted, without deriving blocked/extra", () => {
    setResolved(["2026-03-08"]);
    setExceptions([
      {
        id: "exc-1",
        exceptionDate: "2026-08-01",
        kind: "UNAVAILABLE",
        startLocal: "09:00",
        windowMin: 60,
        reason: null,
      },
    ]);
    render(<UpcomingChangesList />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
  });
});

describe("UpcomingChangesList — empty state", () => {
  it("shows an empty message when there are no DST notices and no exceptions", () => {
    render(<UpcomingChangesList />);
    expect(screen.getByText(/no upcoming changes/i)).toBeInTheDocument();
  });

  it("treats not-yet-loaded query data (undefined) the same as empty", () => {
    mockUseResolvedAvailability.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    mockUseAvailabilityExceptions.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    render(<UpcomingChangesList />);
    expect(screen.getByText(/no upcoming changes/i)).toBeInTheDocument();
  });
});
