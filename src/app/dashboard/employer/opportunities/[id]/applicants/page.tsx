import { listApplicationsForOpportunity } from "@/lib/applications";
import { getOpportunity } from "@/lib/opportunities";

export default async function ApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opportunity = await getOpportunity(id);
  const applications = await listApplicationsForOpportunity(id);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)", marginBottom: 8 }}>
        Applicants for {opportunity.title}
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: 24 }}>
        {applications.length} {applications.length === 1 ? "application" : "applications"}
      </p>

      {applications.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No applications yet.</p>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {applications.map((application) => (
          <div key={application.id} className="card" style={{ padding: 24 }}>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>
              Status: {application.status}
            </span>
            <h2 style={{ margin: "8px 0" }}>{application.profiles?.full_name}</h2>
            <p style={{ color: "var(--muted)" }}>{application.profiles?.email}</p>
            {application.profiles?.location && (
              <p style={{ color: "var(--muted)" }}>{application.profiles.location}</p>
            )}
            {application.profiles?.selected_skills && application.profiles.selected_skills.length > 0 && (
              <p style={{ marginTop: 12 }}>
                <strong>Skills:</strong> {application.profiles.selected_skills.join(", ")}
              </p>
            )}
            {application.cover_note && (
              <p style={{ marginTop: 12 }}>
                <strong>Note:</strong> {application.cover_note}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}