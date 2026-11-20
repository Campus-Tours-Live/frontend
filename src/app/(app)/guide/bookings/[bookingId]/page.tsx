import { GuideBookingDetailPage } from "@/components/bookings/GuideBookingDetailPage";

export default async function GuideBookingDetailRoutePage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  return <GuideBookingDetailPage bookingId={bookingId} />;
}
