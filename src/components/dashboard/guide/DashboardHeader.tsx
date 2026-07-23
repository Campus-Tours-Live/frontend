"use client";

import { Button } from "@/components/ui";

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface DashboardHeaderProps {
  firstName: string | null | undefined;
}

export function DashboardHeader({ firstName }: DashboardHeaderProps) {
  const name = firstName ?? "there";

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="eyebrow mb-2">Guide Dashboard</p>
        <h1 className="h2">
          {getTimeGreeting()}, {name}
        </h1>
        <p className="lead mt-1 max-w-xl">
          Review booking requests, prepare for today&apos;s tours, and keep your guide profile
          ready.
        </p>
      </div>
      <Button variant="secondary" size="small" className="mt-1 shrink-0">
        Edit Availability
      </Button>
    </div>
  );
}
