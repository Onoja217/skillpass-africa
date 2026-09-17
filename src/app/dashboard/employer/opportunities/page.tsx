
import Link from "next/link";
import { listMyOpportunities } from "@/lib/opportunities";
import { PublishButton } from "./publish-button";

export default async function MyOpportunitiesPage() {
  const opportunities = await listMyOpportunities();
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)" }}>My opportunities</h1>
        <Link href="/dashboard/employer/opportunities/new" className="button">
          + Post new
        </Link>
      </div>

      {opportunities.length === 0 && (
        <p style={{ color: "var(--muted)" }}>You haven't posted any opportunities yet.</p>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {opportunities.map((opportunity) => (
          <div key={opportunity.id} className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <span style={{ color: "var(--muted)", fontSize: 14 }}>
                  {opportunity.opportunity_type} · {opportunity.work_arrangement} ·{" "}
                  {opportunity.is_published ? "Published" : "Draft"}
                </span>
                <h2 style={{ margin: "8px 0" }}>{opportunity.title}</h2>
                <p style={{ color: "var(--muted)" }}>{opportunity.organization}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link href={`/dashboard/employer/opportunities/${opportunity.id}/edit`} className="button">
                  Edit
                </Link>
                <PublishButton
                  opportunityId={opportunity.id}
                  isPublished={opportunity.is_published}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}