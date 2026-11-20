import { EditOfferingPage } from "@/components/offerings/EditOfferingPage";

export default async function EditTourOfferingRoutePage({
  params,
}: {
  params: Promise<{ offeringId: string }>;
}) {
  const { offeringId } = await params;
  return <EditOfferingPage offeringId={offeringId} />;
}
