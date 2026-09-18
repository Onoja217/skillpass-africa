import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdministrator } from "@/lib/admin/permissions";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminStatusPill } from "@/components/admin/admin-status-pill";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";

export default async function AdministratorDashboardPage() {
  await requireAdministrator();
  const supabase = await createClient();
  const [usersResult, learnersResult, mentorsResult, employersResult, pendingMentorsResult, submissionsResult, pendingSubmissionsResult, verificationsResult, activeVerificationsResult, suspendedVerificationsResult, recentVerificationsResult, auditResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "learner"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "mentor"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "employer"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "mentor").eq("mentor_status", "pending"),
    supabase.from("submissions").select("id", { count: "exact", head: true }),
    supabase.from("submissions").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
    supabase.from("skill_verifications").select("id", { count: "exact", head: true }),
    supabase.from("skill_verifications").select("id", { count: "exact", head: true }).eq("verification_status", "active"),
    supabase.from("skill_verifications").select("id", { count: "exact", head: true }).eq("verification_status", "suspended"),
    supabase.from("skill_verifications").select("id, decision, competency_rating, verified_at, public_verification_id, verification_status").order("verified_at", { ascending: false }).limit(5),
    supabase.from("audit_logs").select("id, action, description, actor_role, created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const errors = [usersResult.error, learnersResult.error, mentorsResult.error, employersResult.error, pendingMentorsResult.error, submissionsResult.error, pendingSubmissionsResult.error, verificationsResult.error, activeVerificationsResult.error, suspendedVerificationsResult.error, recentVerificationsResult.error, auditResult.error].filter(Boolean);
  if (errors.length) throw new Error("Unable to load the administrator dashboard.");

  const users = usersResult.count ?? 0;
  const learners = learnersResult.count ?? 0;
  const mentors = mentorsResult.count ?? 0;
  const employers = employersResult.count ?? 0;
  const pendingMentors = pendingMentorsResult.count ?? 0;
  const submissions = submissionsResult.count ?? 0;
  const pendingSubmissions = pendingSubmissionsResult.count ?? 0;
  const verifications = verificationsResult.count ?? 0;
  const activeVerifications = activeVerificationsResult.count ?? 0;
  const suspendedVerifications = suspendedVerificationsResult.count ?? 0;

  return (
    <div style={{ display: "grid", gap: 28 }}>\n      {errors.length ? (\n        <section className="notice" role="status">\n          <strong>Some administrator data is temporarily unavailable.</strong>\n          <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>The dashboard is still available. Affected metrics will show as zero or empty until the related data service is available.</p>\n        </section>\n      ) : null}
      <AdminPageHeader
        eyebrow="Administrator dashboard"
        title="Platform overview"
        description="Monitor SkillPass Africa users, learner submissions, mentor activity, and the integrity of verified skills from one place."
      />

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <AdminStatCard label="Total users" value={users} detail={`${learners} learners · ${mentors} mentors · ${employers} employers`} />
        <AdminStatCard label="Submissions" value={submissions} detail={`${pendingSubmissions} awaiting review`} />
        <AdminStatCard label="Verifications" value={verifications} detail={`${activeVerifications} active`} />
        <AdminStatCard label="Pending mentors" value={pendingMentors} detail="Applications needing attention" />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <AdminSection eyebrow="Verification health" title="Verification status">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Active</span><strong>{activeVerifications}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Suspended</span><strong>{suspendedVerifications}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Revoked</span><strong>{Math.max(verifications - activeVerifications - suspendedVerifications, 0)}</strong></div>
          </div>
          <Link className="button" href="/dashboard/administrator/verifications" style={{ marginTop: 20 }}>Open verification controls</Link>
        </AdminSection>

        <AdminSection eyebrow="Administration" title="Admin controls">
          <div style={{ display: "grid", gap: 10 }}>
            <Link className="button" href="/dashboard/administrator/users">Manage users & roles</Link>
            <Link className="button secondary" href="/dashboard/administrator/permissions">Manage permissions</Link>
            <Link className="button secondary" href="/dashboard/administrator/reports">Reports & analytics</Link>
            <Link className="button secondary" href="/dashboard/administrator/audit">Open audit & activity center</Link>
            <Link className="button secondary" href="/dashboard/administrator/verifications">Review verification records</Link>
            <Link className="button secondary" href="/profile">Review administrator profile</Link>
          </div>
        </AdminSection>
      </section>

      <AdminSection eyebrow="Recent activity" title="Latest audit events" action={<Link className="button secondary" href="/dashboard/administrator/audit">View all</Link>}>
        {auditResult.data?.length ? (
          <div style={{ display: "grid", gap: 12 }}>
            {auditResult.data.map((event) => (
              <div key={event.id} style={{ display: "grid", gridTemplateColumns: "minmax(150px, 1fr) auto auto", alignItems: "center", gap: 16, paddingBlock: 14, borderTop: "1px solid #e5e7eb" }}>
                <div><strong>{event.action.replaceAll("_", " ")}</strong><p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>{event.description}</p></div>
                <span style={{ textTransform: "capitalize", fontSize: 12 }}>{event.actor_role ?? "System"}</span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(event.created_at).toLocaleDateString("en-NG", { day: "2-digit", month: "short" })}</span>
              </div>
            ))}
          </div>
        ) : <AdminEmptyState title="No audit activity yet" description="Administrative and security events will appear here as the platform is used." />}
      </AdminSection>

      <AdminSection eyebrow="Recent verification activity" title="Latest records" action={<Link className="button secondary" href="/dashboard/administrator/verifications">View all</Link>}>
        {recentVerificationsResult.data?.length ? (
          <div style={{ display: "grid", gap: 12 }}>
            {recentVerificationsResult.data.map((verification) => (
              <div key={verification.id} style={{ display: "grid", gridTemplateColumns: "minmax(150px, 1fr) auto auto", alignItems: "center", gap: 16, paddingBlock: 14, borderTop: "1px solid #e5e7eb" }}>
                <div><strong>{verification.public_verification_id ?? "Pending public ID"}</strong><p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>Decision: {verification.decision} · Rating: {verification.competency_rating ?? "—"}/5</p></div>
                <AdminStatusPill status={verification.verification_status} />
                <span style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(verification.verified_at).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>
            ))}
          </div>
        ) : <AdminEmptyState title="No verification records yet" description="Verification activity will appear here once records are created." />}
      </AdminSection>

      <section className="notice" style={{ background: "rgba(216,239,131,.35)", color: "var(--ink)" }}>
        <strong>Security status:</strong> public administrator registration remains disabled. Audit data is administrator-only and the audit tables have no authenticated insert, update, or delete policy.
      </section>
    </div>
  );
}
