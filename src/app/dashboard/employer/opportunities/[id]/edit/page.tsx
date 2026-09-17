import { getOpportunity } from "@/lib/opportunities";
import { EditForm } from "./edit-form";

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opportunity = await getOpportunity(id);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)", marginBottom: 24 }}>
        Edit opportunity
      </h1>
      <EditForm opportunity={opportunity} />
    </div>
  );
}