"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  Globe,
  GraduationCap,
  MapPin,
  ShoppingCart,
  Star,
  TicketCheck,
} from "lucide-react";
import {
  ViewerLocalBookingTimeRange,
  ViewerLocalTimeZoneLabel,
} from "@/components/booking/ViewerLocalBookingTimeRange";
import {
  Alert,
  Badge,
  Body,
  Button,
  Card,
  Container,
  Heading,
  Link,
  Radio,
  SectionHeading,
  Skeleton,
  Tag,
  Textarea,
  VisuallyHidden,
} from "@/components/ui";
import {
  ApiError,
  useAddCartItem,
  useCreateBooking,
  useOfferingSlots,
  useTourDetail,
  type BookingResponse,
  type CreateBookingInput,
  type OfferingSlot,
  type TourDetail,
} from "@/lib/data-access";
import { formatOfferingPrice } from "@/lib/format";
import { tourIdFromRef } from "@/lib/tourRefs";
import { cn } from "@/lib/utils";
import { CAMPUS_FALLBACK_IMAGE, languageLabel, topicStyle } from "./tourCard.visuals";

interface TourDetailPageProps {
  tourRef: string;
}

type SubmitMode = "cart" | "booking";

function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}

function DetailSkeleton() {
  return (
    <Container className="py-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div>
          <Skeleton height={320} className="rounded-panel" />
          <Skeleton height={24} width="45%" className="mt-8" />
          <Skeleton height={18} width="80%" className="mt-4" />
          <Skeleton height={18} width="70%" className="mt-3" />
        </div>
        <Card>
          <Skeleton height={28} width="60%" />
          <Skeleton height={52} className="mt-6" />
          <Skeleton height={52} className="mt-4" />
        </Card>
      </div>
    </Container>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Container className="py-16">
      <Card padded={false} className="mx-auto max-w-2xl px-6 py-14 text-center">
        <Heading as="h1" size="h3">
          {title}
        </Heading>
        <Body size="medium" color="muted" className="mt-3">
          {body}
        </Body>
        <Link href="/tours" variant="secondary" size="small" className="mt-6">
          <ArrowLeft size={15} strokeWidth={2} />
          Back to tours
        </Link>
      </Card>
    </Container>
  );
}

function bookingPayload(
  tour: TourDetail,
  slot: OfferingSlot | null,
  notes: string,
): CreateBookingInput | null {
  if (!slot) return null;
  const trimmedNotes = notes.trim();
  return {
    tourOfferingId: tour.id,
    scheduledStartAt: slot.startAt,
    ...(trimmedNotes ? { participantNotes: trimmedNotes } : {}),
  };
}

function SelectedBookingNotice({ mode, booking }: { mode: SubmitMode; booking: BookingResponse }) {
  return (
    <Alert variant="success" role="status" className="mt-5">
      <div>
        <Heading as="h3" size="large">
          {mode === "cart" ? "Added to cart" : "Booking requested"}
        </Heading>
        <Body size="small" color="inherit" className="mt-1">
          <span className="font-semibold">{booking.tourTitle}</span> · {statusLabel(booking.status)}
        </Body>
        <ViewerLocalBookingTimeRange
          scheduledStartAt={booking.scheduledStartAt}
          scheduledEndAt={booking.scheduledEndAt}
          className="mt-2 block text-[13px] font-semibold"
        />
      </div>
    </Alert>
  );
}

function BookingFact({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-primary-soft text-primary-dark"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <Body as="span" size="small" weight={700} color="ink">
          {label}
        </Body>
        <Body as="div" size="small" color="muted" className="mt-0.5">
          {children}
        </Body>
      </div>
    </div>
  );
}

function SelectedSlotSummary({ slot, durationMin }: { slot: OfferingSlot; durationMin: number }) {
  return (
    <div
      role="group"
      aria-label="Selected time details"
      className="mt-4 rounded-card border border-primary/25 bg-primary-soft/35 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Body as="span" size="small" weight={700} color="primary-dark" className="uppercase">
            Selected time
          </Body>
          <ViewerLocalBookingTimeRange
            scheduledStartAt={slot.startAt}
            scheduledEndAt={slot.endAt}
            className="mt-1 block font-display text-[18px] font-bold leading-snug text-ink"
          />
        </div>
        <Badge variant="neutral">Ready</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <BookingFact icon={<Clock size={15} strokeWidth={2} />} label="Duration">
          {durationMin} minutes
        </BookingFact>
        <BookingFact icon={<Globe size={15} strokeWidth={2} />} label="Browser timezone">
          <ViewerLocalTimeZoneLabel />
        </BookingFact>
      </div>

      <Body size="small" color="muted" className="mt-4">
        We save the exact selected time; your screen shows it in your current local timezone.
      </Body>
    </div>
  );
}

function SlotList({
  slots,
  selectedStartAt,
  onSelect,
}: {
  slots: OfferingSlot[];
  selectedStartAt: string | null;
  onSelect: (slot: OfferingSlot) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Available tour times" className="mt-4 space-y-2">
      {slots.map((slot) => {
        const selected = selectedStartAt === slot.startAt;
        return (
          <Radio
            key={slot.startAt}
            name="tour-slot"
            value={slot.startAt}
            checked={selected}
            onChange={() => onSelect(slot)}
            className={cn(
              "w-full rounded-card border bg-card px-3 py-3 transition-colors",
              selected ? "border-primary bg-primary-soft/60" : "border-border hover:bg-muted/70",
            )}
            label={
              <span className="flex min-w-0 flex-col">
                <ViewerLocalBookingTimeRange
                  scheduledStartAt={slot.startAt}
                  scheduledEndAt={slot.endAt}
                  className="font-semibold text-ink"
                />
                <span className="mt-0.5 text-[12px] text-ink-soft">Shown in your local time</span>
              </span>
            }
          />
        );
      })}
    </div>
  );
}

function BookingPanel({ tour }: { tour: TourDetail }) {
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [selectedStartAt, setSelectedStartAt] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    mode: SubmitMode;
    booking: BookingResponse;
  } | null>(null);

  const slotsQuery = useOfferingSlots(tour.id, { enabled: slotsOpen });
  const addCartItem = useAddCartItem();
  const createBooking = useCreateBooking();
  const slots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);
  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.startAt === selectedStartAt) ?? null,
    [selectedStartAt, slots],
  );
  const payload = bookingPayload(tour, selectedSlot, notes);
  const busy = addCartItem.isPending || createBooking.isPending;

  const chooseTimes = () => {
    setSlotsOpen(true);
    setSubmitError(null);
  };

  const resetSelectionFeedback = () => {
    setSubmitError(null);
    setLastResult(null);
  };

  const submit = async (mode: SubmitMode) => {
    if (!payload) return;
    setSubmitError(null);
    try {
      const booking =
        mode === "cart"
          ? await addCartItem.mutateAsync(payload)
          : await createBooking.mutateAsync(payload);
      setLastResult({ mode, booking });
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  };

  return (
    <Card as="aside" className="lg:sticky lg:top-28">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Body as="span" size="small" weight={700} color="primary-dark" className="uppercase">
            Booking
          </Body>
          <Heading as="h2" size="h4" className="mt-1">
            Book this tour
          </Heading>
          <Body size="large" weight={700} color="ink" className="mt-1">
            {formatOfferingPrice(tour.priceCents, tour.currency)}
          </Body>
        </div>
        <Badge variant="verified">Viewer-local time</Badge>
      </div>

      <div className="mt-5 rounded-card border border-border bg-muted/60 p-3">
        <Body size="small" color="muted">
          Tour times are rendered in your browser timezone. The booking request saves the exact
          selected time.
        </Body>
      </div>

      <Button variant="primary" block className="mt-5" onClick={chooseTimes}>
        <CalendarClock size={17} strokeWidth={2} />
        Choose time
      </Button>

      {slotsOpen ? (
        <div className="mt-5 border-t border-border pt-5">
          <Heading as="h3" size="large">
            Available times
          </Heading>
          <VisuallyHidden as="p" role="status" aria-live="polite" aria-atomic>
            {selectedSlot ? (
              <>
                Selected{" "}
                <ViewerLocalBookingTimeRange
                  scheduledStartAt={selectedSlot.startAt}
                  scheduledEndAt={selectedSlot.endAt}
                />
                . Cart and booking actions are available.
              </>
            ) : (
              "No time selected yet."
            )}
          </VisuallyHidden>

          {slotsQuery.isLoading ? (
            <div aria-label="Loading available times" className="mt-4 space-y-2">
              <Skeleton height={52} className="rounded-card" />
              <Skeleton height={52} className="rounded-card" />
              <Skeleton height={52} className="rounded-card" />
            </div>
          ) : null}

          {slotsQuery.isError ? (
            <Alert variant="warning" className="mt-4">
              <div>
                <Heading as="h4" size="large">
                  Times are unavailable
                </Heading>
                <Body size="small" color="inherit" className="mt-1">
                  {errorMessage(slotsQuery.error)}
                </Body>
                <Button
                  variant="ghost"
                  size="small"
                  className="mt-2 px-0"
                  onClick={() => void slotsQuery.refetch()}
                >
                  Try again
                </Button>
              </div>
            </Alert>
          ) : null}

          {!slotsQuery.isLoading && !slotsQuery.isError && slots.length === 0 ? (
            <Alert
              variant="info"
              role="status"
              className="mt-4"
              action={
                <Link href="/tours" variant="secondary" size="small">
                  Browse other tours
                </Link>
              }
            >
              <div>
                <Heading as="h4" size="large">
                  No open times yet
                </Heading>
                <Body size="small" color="inherit" className="mt-1">
                  No bookable times are open for this tour yet.
                </Body>
              </div>
            </Alert>
          ) : null}

          {slots.length > 0 ? (
            <>
              <SlotList
                slots={slots}
                selectedStartAt={selectedStartAt}
                onSelect={(slot) => {
                  setSelectedStartAt(slot.startAt);
                  resetSelectionFeedback();
                }}
              />
              {selectedSlot ? (
                <SelectedSlotSummary slot={selectedSlot} durationMin={tour.durationMin} />
              ) : (
                <Body size="small" color="muted" className="mt-3">
                  Select a time to unlock cart and booking actions.
                </Body>
              )}
              <Textarea
                label="Notes for the guide"
                optional
                maxLength={1000}
                rows={4}
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  resetSelectionFeedback();
                }}
                fieldClassName="mt-5"
              />
              {submitError ? (
                <Alert variant="error" className="mt-4">
                  {submitError}
                </Alert>
              ) : null}
              {busy && selectedSlot ? (
                <Alert variant="info" role="status" className="mt-4">
                  Saving your selected time. Keep this tab open until the request finishes.
                </Alert>
              ) : null}
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Button
                  variant="secondary"
                  disabled={!payload || busy}
                  loading={addCartItem.isPending}
                  onClick={() => void submit("cart")}
                >
                  <ShoppingCart size={16} strokeWidth={2} />
                  {addCartItem.isPending ? "Adding..." : "Add to cart"}
                </Button>
                <Button
                  variant="primary"
                  disabled={!payload || busy}
                  loading={createBooking.isPending}
                  onClick={() => void submit("booking")}
                >
                  <TicketCheck size={16} strokeWidth={2} />
                  {createBooking.isPending ? "Booking..." : "Book now"}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {lastResult ? (
        <SelectedBookingNotice mode={lastResult.mode} booking={lastResult.booking} />
      ) : null}
    </Card>
  );
}

export function TourDetailPage({ tourRef }: TourDetailPageProps) {
  const tourId = tourIdFromRef(tourRef);
  const { data: tour, isLoading, isError, error } = useTourDetail(tourId ?? "");
  const [imageFailed, setImageFailed] = useState(false);

  if (!tourId) {
    return (
      <EmptyState
        title="We couldn't open this tour link"
        body="Explore tours again and choose a current listing."
      />
    );
  }

  if (isLoading) return <DetailSkeleton />;

  if (isError || !tour) {
    return (
      <EmptyState
        title="Tour unavailable"
        body={
          error instanceof ApiError ? error.message : "This tour could not be loaded right now."
        }
      />
    );
  }

  const t = topicStyle(tour.topic);
  const TopicIcon = t.icon;
  const imageSrc = imageFailed
    ? CAMPUS_FALLBACK_IMAGE
    : (tour.universityImageUrl ?? CAMPUS_FALLBACK_IMAGE);
  const location = [tour.universityCity, tour.universityRegion].filter(Boolean).join(", ");

  return (
    <div className="pb-20">
      <section className="border-b border-border/70 bg-muted">
        <Container className="py-8 lg:py-12">
          <Link href="/tours" className="inline-flex items-center gap-1 text-ui font-semibold">
            <ArrowLeft size={15} strokeWidth={2} />
            Back to tours
          </Link>

          <div className="mt-7 grid items-center gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-panel border border-border bg-card shadow-card">
              <Image
                src={imageSrc}
                alt={`${tour.universityName} campus`}
                fill
                sizes="(max-width: 1024px) 100vw, 46vw"
                className="object-cover"
                priority
                onError={() => setImageFailed(true)}
              />
              <div className={cn("absolute inset-x-0 bottom-0 h-1.5", t.dot)} aria-hidden />
            </div>

            <div className="max-w-2xl">
              <Tag
                color={t.tagColor}
                variant="inverse"
                leading={<TopicIcon size={14} strokeWidth={2} aria-hidden />}
                className="mb-4 w-fit gap-1.5 px-3 py-1.5 text-[12.5px] font-bold"
              >
                {t.label}
              </Tag>
              <SectionHeading eyebrow={tour.universityName} title={tour.title} level={1} />
              {tour.description ? (
                <Body size="large" color="muted" className="mt-4">
                  {tour.description}
                </Body>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-2">
                {location ? (
                  <Tag color="gray" leading={<MapPin size={13} strokeWidth={2} aria-hidden />}>
                    {location}
                  </Tag>
                ) : null}
                <Tag color="gray" leading={<Clock size={13} strokeWidth={2} aria-hidden />}>
                  {tour.durationMin} min
                </Tag>
                <Tag color="spark" leading={<Star size={13} strokeWidth={2} aria-hidden />}>
                  {tour.avgRating.toFixed(tour.avgRating % 1 === 0 ? 0 : 1)} ({tour.reviewCount})
                </Tag>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <BookingPanel tour={tour} />

          <div className="space-y-8 lg:order-first">
            <section>
              <Heading as="h2" size="h3">
                About this tour
              </Heading>
              <Body size="medium" color="muted" className="mt-3 max-w-3xl">
                {tour.description ??
                  "A live campus conversation with a verified student guide, tailored around the questions you bring."}
              </Body>
            </section>

            <Card as="section">
              <Heading as="h2" size="h4">
                Meet your guide
              </Heading>
              <div className="mt-4 flex items-start gap-4">
                <span
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-pill font-display text-[15px] font-bold text-ivory",
                    t.dot,
                  )}
                  aria-hidden
                >
                  {tour.guideDisplayName
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase() || "?"}
                </span>
                <div className="min-w-0">
                  <Heading as="h3" size="large">
                    {tour.guideDisplayName}
                  </Heading>
                  <Body size="small" color="muted" className="mt-1 inline-flex items-center gap-1">
                    <GraduationCap size={14} strokeWidth={2} aria-hidden />
                    Student guide
                  </Body>
                  {tour.guideBio ? (
                    <Body size="medium" color="muted" className="mt-3">
                      {tour.guideBio}
                    </Body>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card as="section">
              <Heading as="h2" size="h4">
                Tour details
              </Heading>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <Body size="small" weight={700} color="ink">
                    Languages
                  </Body>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tour.languages.length > 0 ? (
                      tour.languages.map((lang) => (
                        <Tag
                          key={lang}
                          color="gray"
                          leading={<Globe size={13} strokeWidth={2} aria-hidden />}
                        >
                          {languageLabel(lang)}
                        </Tag>
                      ))
                    ) : (
                      <Body size="small" color="muted">
                        Details coming soon
                      </Body>
                    )}
                  </div>
                </div>
                <div>
                  <Body size="small" weight={700} color="ink">
                    Features
                  </Body>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Body size="small" color="muted">
                      Details coming soon
                    </Body>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
