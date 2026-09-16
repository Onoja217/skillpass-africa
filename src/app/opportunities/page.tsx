import { listOpportunities } from "@/lib/opportunities";

export default async function OpportunitiesPage() {
  const opportunities = await listOpportunities();
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)", marginBottom: 24 }}>
        Open opportunities
      </h1>

      {opportunities.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No opportunities posted yet.</p>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {opportunities.map((opportunity) => (
          <div key={opportunity.id} className="card" style={{ padding: 24 }}>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>
              {opportunity.opportunity_type} · {opportunity.work_arrangement}
            </span>
            <h2 style={{ margin: "8px 0" }}>{opportunity.title}</h2>
            <p style={{ color: "var(--muted)" }}>{opportunity.organization}</p>
            <p>{opportunity.description}</p>
            {opportunity.required_skills.length > 0 && (
              <p style={{ marginTop: 12 }}>
                <strong>Skills:</strong> {opportunity.required_skills.join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}