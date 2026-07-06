import { DashboardHeader } from "./DashboardHeader";
import type { GuideDashboard } from "@/lib/data-access";

interface GuideDashboardShellProps {
  data: GuideDashboard;
}

export function GuideDashboardShell({ data }: GuideDashboardShellProps) {
  const { guide } = data;

  return (
    <div>
      <DashboardHeader firstName={guide.firstName} />
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {/* PR 2: Filter tabs */}
          {/* PR 3: Stats row + profile status card */}
          {/* PR 5: Booking requests section */}
          {/* PR 6: Today's tour schedule */}
          {/* PR 7: Confirmed tours */}
        </div>
        <div className="space-y-4">{/* PR 8: Right rail widgets */}</div>
      </div>
    </div>
  );
}
