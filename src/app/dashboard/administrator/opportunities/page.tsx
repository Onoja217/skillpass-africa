import { listAllOpportunitiesForAdmin } from "@/lib/opportunities";
import { ModerationButton } from "./moderation-button";

export default async function AdminOpportunitiesPage() {
  const opportunities = await listAllOpportunitiesForAdmin();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)", marginBottom: 24 }}>
        Moderate opportunities
      </h1>

      {opportunities.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No opportunities posted yet.</p>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {opportunities.map((opportunity) => (
          <div key={opportunity.id} className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <span style={{ color: "var(--muted)", fontSize: 14 }}>
                  {opportunity.opportunity_type} · {opportunity.is_published ? "Published" : "Draft"}
                </span>
                <h2 style={{ margin: "8px 0" }}>{opportunity.title}</h2>
                <p style={{ color: "var(--muted)" }}>
                  {opportunity.organization} · Posted by {opportunity.profiles?.full_name} ({opportunity.profiles?.email})
                </p>
              </div>
              <ModerationButton
                opportunityId={opportunity.id}
                isPublished={opportunity.is_published}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}