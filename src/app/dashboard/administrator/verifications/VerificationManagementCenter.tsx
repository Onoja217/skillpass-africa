"use client";

import { useMemo, useState } from "react";
import VerificationStatusForm from "./VerificationStatusForm";

type VerificationStatus = "active" | "revoked" | "suspended";
type VerificationDecision = "approved" | "rejected" | "revision_requested";

type Verification = {
  id: string;
  public_verification_id: string | null;
  decision: VerificationDecision;
  verification_status: VerificationStatus;
  competency_rating: number | null;
  verified_at: string;
  learner_name: string;
  learner_email: string;
  mentor_name: string;
  skill_name: string;
  assessment_title: string;
  audit: Array<{
    id: string;
    action: string;
    comments: string | null;
    actor_name: string;
    created_at: string;
  }>;
};

const statusLabels: Record<VerificationStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  revoked: "Revoked",
};

const decisionLabels: Record<VerificationDecision, string> = {
  approved: "Approved",
  rejected: "Rejected",
  revision_requested: "Revision requested",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function VerificationManagementCenter({ verifications }: { verifications: Verification[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | VerificationStatus>("all");
  const [decision, setDecision] = useState<"all" | VerificationDecision>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = useMemo(() => ({
    total: verifications.length,
    active: verifications.filter((item) => item.verification_status === "active").length,
    suspended: verifications.filter((item) => item.verification_status === "suspended").length,
    revoked: verifications.filter((item) => item.verification_status === "revoked").length,
  }), [verifications]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return verifications.filter((item) => {
      const matchesQuery = !normalized || [
        item.public_verification_id,
        item.learner_name,
        item.learner_email,
        item.mentor_name,
        item.skill_name,
        item.assessment_title,
      ].some((value) => value?.toLowerCase().includes(normalized));
      const matchesStatus = status === "all" || item.verification_status === status;
      const matchesDecision = decision === "all" || item.decision === decision;
      return matchesQuery && matchesStatus && matchesDecision;
    });
  }, [decision, query, status, verifications]);

  return (
    <>
      <section className="card" style={{ padding: 20, marginTop: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          {[
            ["Total records", stats.total],
            ["Active", stats.active],
            ["Suspended", stats.suspended],
            ["Revoked", stats.revoked],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 14 }}>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>{label}</span>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 20, marginTop: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) repeat(2,minmax(150px,220px))", gap: 12 }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search learner, mentor, skill or verification ID"
            aria-label="Search verification records"
            style={{ padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "inherit" }}
          />
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} style={{ padding: 12 }} aria-label="Filter by verification status">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="revoked">Revoked</option>
          </select>
          <select value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)} style={{ padding: 12 }} aria-label="Filter by decision">
            <option value="all">All decisions</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="revision_requested">Revision requested</option>
          </select>
        </div>
        <p style={{ color: "var(--muted)", margin: "12px 0 0" }}>
          Showing {filtered.length} of {verifications.length} verification records.
        </p>
      </section>

      <section style={{ display: "grid", gap: 16, marginTop: 16 }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: 24 }}>No verification records match the selected filters.</div>
        ) : filtered.map((verification) => {
          const expanded = expandedId === verification.id;
          return (
            <article key={verification.id} className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <p className="eyebrow">{verification.public_verification_id ?? "No public ID"}</p>
                  <h2 style={{ margin: "6px 0", fontSize: 22 }}>{verification.skill_name}</h2>
                  <p style={{ margin: 0, color: "var(--muted)" }}>{verification.assessment_title}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="badge">{decisionLabels[verification.decision]}</span>
                  <span className="badge">{statusLabels[verification.verification_status]}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 20 }}>
                <div><span style={{ color: "var(--muted)", fontSize: 13 }}>Learner</span><strong style={{ display: "block", marginTop: 3 }}>{verification.learner_name}</strong><small>{verification.learner_email}</small></div>
                <div><span style={{ color: "var(--muted)", fontSize: 13 }}>Mentor</span><strong style={{ display: "block", marginTop: 3 }}>{verification.mentor_name}</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: 13 }}>Competency rating</span><strong style={{ display: "block", marginTop: 3 }}>{verification.competency_rating ?? "—"} / 5</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: 13 }}>Verified</span><strong style={{ display: "block", marginTop: 3 }}>{formatDate(verification.verified_at)}</strong></div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
                {verification.public_verification_id && (
                  <a className="button" href={`/verify/${verification.public_verification_id}`} target="_blank" rel="noreferrer">Open public record</a>
                )}
                <button type="button" className="button" onClick={() => setExpandedId(expanded ? null : verification.id)}>
                  {expanded ? "Hide audit history" : "View audit history"}
                </button>
              </div>

              <VerificationStatusForm verificationId={verification.id} currentStatus={verification.verification_status} />

              {expanded && (
                <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
                  <h3 style={{ marginTop: 0 }}>Verification audit history</h3>
                  {verification.audit.length === 0 ? (
                    <p style={{ color: "var(--muted)" }}>No audit entries are available.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {verification.audit.map((entry) => (
                        <div key={entry.id} style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 12 }}>
                          <strong>{entry.action.replaceAll("_", " ")}</strong>
                          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>{entry.actor_name} · {formatDate(entry.created_at)}</div>
                          {entry.comments && <p style={{ marginBottom: 0 }}>{entry.comments}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </>
  );
}
