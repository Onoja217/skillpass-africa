import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

const actionLabels: Record<string, string> = {
  LOGIN_SUCCESS: "Login successful", LOGIN_FAILED: "Login failed", LOGOUT: "Logout", USER_CREATED: "User created", USER_UPDATED: "Profile updated",
  USER_SUSPENDED: "User suspended", USER_REACTIVATED: "User reactivated", ROLE_REQUESTED: "Role requested", ROLE_APPROVED: "Role approved",
  ROLE_REJECTED: "Role rejected", ROLE_ASSIGNED: "Role assigned", ROLE_REMOVED: "Role removed", ROLE_CHANGED: "Role changed",
  VERIFICATION_SUBMITTED: "Verification submitted", VERIFICATION_APPROVED: "Verification approved", VERIFICATION_REJECTED: "Verification rejected",
  VERIFICATION_REVIEWED: "Verification reviewed", APPLICATION_SUBMITTED: "Application submitted", APPLICATION_APPROVED: "Application approved",
  APPLICATION_REJECTED: "Application rejected", ADMIN_ACTION: "Administrator action", PERMISSION_CHANGED: "Permission changed", SECURITY_EVENT: "Security event",
};

function formatDate(value: string) { return new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }); }

export default async function AdministratorAuditPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "administrator") redirect(`/dashboard/${profile.role}`);
  const supabase = await createClient();

  const [auditResult, loginResult, usersResult, rolesResult] = await Promise.all([
    supabase.from("audit_logs").select("id, actor_id, actor_role, action, entity_type, entity_id, description, metadata, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("login_activity").select("id, user_id, identifier, event_type, success, failure_reason, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("profiles").select("id, full_name, email, role, created_at, updated_at").order("updated_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("role", { count: "exact", head: false }),
  ]);

  if (auditResult.error || loginResult.error || usersResult.error || rolesResult.error) throw new Error("Unable to load administrator audit activity.");
  const logs = auditResult.data ?? [];
  const logins = loginResult.data ?? [];
  const users = usersResult.data ?? [];
  const roleCounts = users.reduce<Record<string, number>>((acc, user) => { acc[user.role] = (acc[user.role] ?? 0) + 1; return acc; }, {});
  const failedLogins = logins.filter((entry) => !entry.success).length;
  const successfulLogins = logins.filter((entry) => entry.success).length;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section>
        <p className="eyebrow">Administrator audit center</p>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-.045em", margin: "10px 0" }}>Activity & accountability</h1>
        <p style={{ color: "var(--muted)", fontSize: 17, maxWidth: 760 }}>Review security-relevant user, role, authentication, verification, and administrator activity from one protected view.</p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {[["Users", users.length], ["Administrators", roleCounts.administrator ?? 0], ["Mentors", roleCounts.mentor ?? 0], ["Successful logins", successfulLogins], ["Failed logins", failedLogins]].map(([label, value]) => (
          <article className="card" style={{ padding: 20 }} key={String(label)}><p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>{label}</p><strong style={{ display: "block", fontSize: 30, marginTop: 6 }}>{value}</strong></article>
        ))}
      </section>

      <section className="card" style={{ padding: 24 }}>
        <p className="eyebrow" style={{ marginTop: 0 }}>Role distribution</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>{Object.entries(roleCounts).map(([role, count]) => <span key={role} style={{ padding: "8px 12px", borderRadius: 999, background: "#f3f4f6", fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{role}: {count}</span>)}</div>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}><div><p className="eyebrow" style={{ margin: 0 }}>Audit trail</p><h2 style={{ margin: "8px 0 0" }}>Recent platform activity</h2></div><span style={{ color: "var(--muted)", fontSize: 13 }}>{logs.length} recent events</span></div>
        <div style={{ overflowX: "auto", marginTop: 18 }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}><thead><tr>{["Activity", "Actor", "Entity", "Time"].map((heading) => <th key={heading} style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #e5e7eb", color: "var(--muted)", fontSize: 12 }}>{heading}</th>)}</tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9" }}><strong>{actionLabels[log.action] ?? log.action}</strong><div style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>{log.description}</div></td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9" }}>{log.actor_role ?? "System"}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9" }}>{log.entity_type}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap", color: "var(--muted)", fontSize: 12 }}>{formatDate(log.created_at)}</td></tr>)}{!logs.length && <tr><td colSpan={4} style={{ padding: 20, color: "var(--muted)" }}>No audit events recorded yet.</td></tr>}</tbody></table></div>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <p className="eyebrow" style={{ marginTop: 0 }}>Login activity</p><h2 style={{ margin: "8px 0 0" }}>Authentication events</h2>
        <div style={{ overflowX: "auto", marginTop: 18 }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}><thead><tr>{["Identifier", "Event", "Result", "Reason", "Time"].map((heading) => <th key={heading} style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #e5e7eb", color: "var(--muted)", fontSize: 12 }}>{heading}</th>)}</tr></thead><tbody>{logins.map((login) => <tr key={login.id}><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9" }}>{login.identifier ?? "Account"}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9" }}>{login.event_type.replaceAll("_", " ")}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>{login.success ? "Success" : "Failed"}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9", color: "var(--muted)" }}>{login.failure_reason ?? "—"}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap", color: "var(--muted)", fontSize: 12 }}>{formatDate(login.created_at)}</td></tr>)}{!logins.length && <tr><td colSpan={5} style={{ padding: 20, color: "var(--muted)" }}>No login activity recorded yet.</td></tr>}</tbody></table></div>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <p className="eyebrow" style={{ marginTop: 0 }}>Users & roles</p><h2 style={{ margin: "8px 0 0" }}>Recent user activity</h2>
        <div style={{ display: "grid", gap: 10, marginTop: 18 }}>{users.slice(0, 20).map((user) => <div key={user.id} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) 120px minmax(150px, auto)", gap: 14, alignItems: "center", borderTop: "1px solid #e5e7eb", padding: "13px 0" }}><div><strong>{user.full_name}</strong><div style={{ color: "var(--muted)", fontSize: 12 }}>{user.email}</div></div><span style={{ textTransform: "capitalize", fontWeight: 700, fontSize: 13 }}>{user.role}</span><span style={{ color: "var(--muted)", fontSize: 12 }}>Updated {formatDate(user.updated_at)}</span></div>)}</div>
      </section>
    </div>
  );
}
