"use client";

import { CircleDollarSign, Clock3, CreditCard, Landmark, ReceiptText } from "lucide-react";
import {
  Badge,
  Body,
  Card,
  CardContent,
  CardHeader,
  Heading,
  Link,
  PageContainer,
  PageHeader,
} from "@/components/ui";

const SUMMARY_CARDS = [
  {
    label: "Available balance",
    value: "$0.00",
    detail: "Ready for payout",
    icon: CircleDollarSign,
  },
  {
    label: "Pending earnings",
    value: "$0.00",
    detail: "From tours awaiting completion",
    icon: Clock3,
  },
  {
    label: "Lifetime earnings",
    value: "$0.00",
    detail: "Total paid bookings",
    icon: ReceiptText,
  },
  {
    label: "Completed tours",
    value: "0",
    detail: "Tours counted toward earnings",
    icon: CreditCard,
  },
];

/**
 * Guide earnings workspace.
 *
 * The BFF/Core do not expose a guide earnings or payout read yet, so this page deliberately renders
 * the real route + navigation target with a transparent empty state. Once an earnings endpoint is
 * available, replace the static summary with a data-access hook rather than seeding fake revenue.
 */
export function GuideEarningsPage() {
  return (
    <PageContainer width="wide">
      <PageHeader
        title="Earnings"
        lead="Track tour revenue, payout readiness, and completed booking activity from one place."
        action={
          <Link href="/guide/tour-offerings" variant="secondary">
            Manage offerings
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_CARDS.map((card) => (
          <Card key={card.label} as="section" className="relative overflow-hidden">
            <div className="absolute right-4 top-4 rounded-full bg-primary/10 p-2 text-primary">
              <card.icon aria-hidden="true" className="h-5 w-5" />
            </div>
            <Body size="small" weight={600} color="muted" className="pr-12">
              {card.label}
            </Body>
            <Heading as="div" size="h3" className="mt-3">
              {card.value}
            </Heading>
            <Body size="small" color="muted" className="mt-1">
              {card.detail}
            </Body>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card as="section" padded={false} size="large">
          <CardHeader
            leadingIcon={<ReceiptText aria-hidden="true" className="h-5 w-5" />}
            title="Recent earnings"
            trailing={<Badge variant="neutral">Coming soon</Badge>}
          />
          <CardContent>
            <div className="rounded-3xl border border-dashed border-border bg-muted px-6 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CircleDollarSign aria-hidden="true" className="h-6 w-6" />
              </div>
              <Heading as="h2" size="large" className="mt-4">
                No earnings yet
              </Heading>
              <Body color="muted" className="mx-auto mt-2 max-w-xl">
                Completed paid bookings will appear here with the tour, participant, amount, and
                payout status once earnings data is available.
              </Body>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/guide/tour-offerings/new" variant="primary">
                  Create tour offering
                </Link>
                <Link href="/guide/availability" variant="secondary">
                  Set availability
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card as="section" padded={false} size="large">
          <CardHeader
            leadingIcon={<Landmark aria-hidden="true" className="h-5 w-5" />}
            title="Payout setup"
          />
          <CardContent className="space-y-4">
            <Body color="muted">
              Payout account connection is not enabled in the frontend contract yet. When payments
              are connected, this area can show bank status, next payout date, and payout history.
            </Body>
            <div className="rounded-2xl border border-border bg-muted p-4">
              <Body size="small" weight={700}>
                To start earning
              </Body>
              <ol className="mt-3 space-y-2 text-ui-sm text-ink-soft">
                <li>1. Get your guide application approved.</li>
                <li>2. Set weekly availability.</li>
                <li>3. Publish at least one tour offering.</li>
                <li>4. Complete participant bookings.</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
