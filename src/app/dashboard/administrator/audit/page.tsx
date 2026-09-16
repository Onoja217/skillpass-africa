import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { AuditAction } from "@/types/database";

const actionLabels: Record<string, string> = {
  LOGIN_SUCCESS: "Login successful", LOGIN_FAILED: "Login failed", LOGOUT: "Logout", USER_CREATED: "User created", USER_UPDATED: "Profile updated",
  USER_SUSPENDED: "User suspended", USER_REACTIVATED: "User reactivated", ROLE_REQUESTED: "Role requested", ROLE_APPROVED: "Role approved",
  ROLE_REJECTED: "Role rejected", ROLE_ASSIGNED: "Role assigned", ROLE_REMOVED: "Role removed", ROLE_CHANGED: "Role changed",
  VERIFICATION_SUBMITTED: "Verification submitted", VERIFICATION_APPROVED: "Verification approved", VERIFICATION_REJECTED: "Verification rejected",
  VERIFICATION_REVIEWED: "Verification reviewed", APPLICATION_SUBMITTED: "Application submitted", APPLICATION_APPROVED: "Application approved",
  APPLICATION_REJECTED: "Application rejected", ADMIN_ACTION: "Administrator action", PERMISSION_CHANGED: "Permission changed", SECURITY_EVENT: "Security event",
};

const actions: AuditAction[] = [
  "LOGIN_SUCCESS", "LOGIN_FAILED", "LOGOUT", "USER_CREATED", "USER_UPDATED", "USER_SUSPENDED", "USER_REACTIVATED",
  "ROLE_REQUESTED", "ROLE_APPROVED", "ROLE_REJECTED", "ROLE_ASSIGNED", "ROLE_REMOVED", "ROLE_CHANGED",
  "VERIFICATION_SUBMITTED", "VERIFICATION_APPROVED", "VERIFICATION_REJECTED", "VERIFICATION_REVIEWED",
  "APPLICATION_SUBMITTED", "APPLICATION_APPROVED", "APPLICATION_REJECTED", "ADMIN_ACTION", "PERMISSION_CHANGED", "SECURITY_EVENT",
];

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function roleLabel(value: string | null) {
  return value ? value.replaceAll("_", " ") : "System";
}

export default async function AdministratorAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (profile.role !== "administrator") redirect(`/dashboard/${profile.role}`);

  const params = await searchParams;
  const getParam = (name: string) => {
    const value = params[name];
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  };

  const query = getParam("q").trim();
  const action = getParam("action") as AuditAction | "";
  const entityType = getParam("entity").trim();
  const actorRole = getParam("actor");
  const from = getParam("from");
  const to = getParam("to");
  const page = Math.max(1, Number.parseInt(getParam("page") || "1", 10) || 1);
  const pageSize = 25;
  const offset = (page - 1) * pageSize;

  const supabase = await createClient();
  let auditQuery = supabase
    .from("audit_logs")
    .select("id, actor_id, actor_role, action, entity_type, entity_id, description, metadata, ip_address, user_agent, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (query) auditQuery = auditQuery.ilike("description", `%${query}%`);
  if (action && actions.includes(action)) auditQuery = auditQuery.eq("action", action);
  if (entityType) auditQuery = auditQuery.ilike("entity_type", `%${entityType}%`);
  if (actorRole) auditQuery = auditQuery.eq("actor_role", actorRole as "learner" | "mentor" | "employer" | "administrator");
  if (from) auditQuery = auditQuery.gte("created_at", new Date(`${from}T00:00:00`).toISOString());
  if (to) {
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    auditQuery = auditQuery.lt("created_at", end.toISOString());
  }

  const [auditResult, loginResult, usersResult, roleHistoryResult] = await Promise.all([
    auditQuery.range(offset, offset + pageSize - 1),
    supabase.from("login_activity").select("id, user_id, identifier, event_type, success, failure_reason, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("id, full_name, email, role").order("updated_at", { ascending: false }).limit(100),
    supabase.from("role_history").select("id, user_id, previous_role, new_role, changed_by, reason, created_at").order("created_at", { ascending: false }).limit(25),
  ]);

  if (auditResult.error || loginResult.error || usersResult.error || roleHistoryResult.error) {
    throw new Error("Unable to load administrator audit activity.");
  }

  const logs = auditResult.data ?? [];
  const logins = loginResult.data ?? [];
  const users = usersResult.data ?? [];
  const roleHistory = roleHistoryResult.data ?? [];
  const total = auditResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const actorIds = [...new Set([...logs.map((log) => log.actor_id), ...roleHistory.map((entry) => entry.changed_by)].filter(Boolean))] as string[];
  const actorResult = actorIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
    : { data: [], error: null };
  if (actorResult.error) throw new Error("Unable to load audit actors.");
  const actorMap = new Map((actorResult.data ?? []).map((actor) => [actor.id, actor]));
  const roleCounts = users.reduce<Record<string, number>>((acc, user) => { acc[user.role] = (acc[user.role] ?? 0) + 1; return acc; }, {});
  const failedLogins = logins.filter((entry) => !entry.success).length;
  const successfulLogins = logins.filter((entry) => entry.success).length;

  const buildPageUrl = (nextPage: number) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (action) next.set("action", action);
    if (entityType) next.set("entity", entityType);
    if (actorRole) next.set("actor", actorRole);
    if (from) next.set("from", from);
    if (to) next.set("to", to);
    next.set("page", String(nextPage));
    return `?${next.toString()}`;
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section>
        <p className="eyebrow">Administrator audit center</p>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-.045em", margin: "10px 0" }}>Activity & accountability</h1>
        <p style={{ color: "var(--muted)", fontSize: 17, maxWidth: 760 }}>Search, filter, and inspect security-relevant user, role, authentication, verification, and administrator activity.</p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {[["Users", users.length], ["Administrators", roleCounts.administrator ?? 0], ["Mentors", roleCounts.mentor ?? 0], ["Successful logins", successfulLogins], ["Failed logins", failedLogins]].map(([label, value]) => (
          <article className="card" style={{ padding: 20 }} key={String(label)}><p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>{label}</p><strong style={{ display: "block", fontSize: 30, marginTop: 6 }}>{value}</strong></article>
        ))}
      </section>

      <section className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div><p className="eyebrow" style={{ margin: 0 }}>Audit search</p><h2 style={{ margin: "8px 0 0" }}>Filter activity</h2></div>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{total} matching events</span>
        </div>
        <form method="get" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginTop: 18 }}>
          <input name="q" defaultValue={query} placeholder="Search description" aria-label="Search audit descriptions" />
          <select name="action" defaultValue={action} aria-label="Filter by action"><option value="">All actions</option>{actions.map((item) => <option key={item} value={item}>{actionLabels[item]}</option>)}</select>
          <input name="entity" defaultValue={entityType} placeholder="Entity type" aria-label="Filter by entity type" />
          <select name="actor" defaultValue={actorRole} aria-label="Filter by actor role"><option value="">All actor roles</option><option value="administrator">Administrator</option><option value="mentor">Mentor</option><option value="employer">Employer</option><option value="learner">Learner</option></select>
          <input type="date" name="from" defaultValue={from} aria-label="Start date" />
          <input type="date" name="to" defaultValue={to} aria-label="End date" />
          <button className="button" type="submit">Apply filters</button>
          <a className="button secondary" href="/dashboard/administrator/audit">Clear</a>
        </form>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}><div><p className="eyebrow" style={{ margin: 0 }}>Audit trail</p><h2 style={{ margin: "8px 0 0" }}>Platform activity</h2></div><span style={{ color: "var(--muted)", fontSize: 13 }}>Page {Math.min(page, totalPages)} of {totalPages}</span></div>
        <div style={{ overflowX: "auto", marginTop: 18 }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}><thead><tr>{["Activity", "Actor", "Entity", "Details", "Time"].map((heading) => <th key={heading} style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #e5e7eb", color: "var(--muted)", fontSize: 12 }}>{heading}</th>)}</tr></thead><tbody>{logs.map((log) => { const actor = log.actor_id ? actorMap.get(log.actor_id) : null; return <tr key={log.id}><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9" }}><strong>{actionLabels[log.action] ?? log.action}</strong><div style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>{log.description}</div></td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9" }}>{actor?.full_name ?? "System"}<div style={{ color: "var(--muted)", fontSize: 12 }}>{roleLabel(log.actor_role)}</div></td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9" }}>{log.entity_type}<div style={{ color: "var(--muted)", fontSize: 11 }}>{log.entity_id ?? "—"}</div></td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9", maxWidth: 320 }}><details><summary style={{ cursor: "pointer", fontWeight: 700 }}>Inspect event</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 11, marginTop: 10 }}>{JSON.stringify(log.metadata, null, 2)}</pre>{log.ip_address && <div style={{ color: "var(--muted)", fontSize: 11 }}>IP: {log.ip_address}</div>}</details></td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap", color: "var(--muted)", fontSize: 12 }}>{formatDate(log.created_at)}</td></tr>; })}{!logs.length && <tr><td colSpan={5} style={{ padding: 20, color: "var(--muted)" }}>No audit events match the selected filters.</td></tr>}</tbody></table></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 18 }}>
          {page > 1 ? <a className="button secondary" href={buildPageUrl(page - 1)}>Previous</a> : <span />}
          {page < totalPages ? <a className="button secondary" href={buildPageUrl(page + 1)}>Next</a> : <span />}
        </div>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <p className="eyebrow" style={{ marginTop: 0 }}>Role history</p><h2 style={{ margin: "8px 0 0" }}>Administrative role changes</h2>
        <div style={{ overflowX: "auto", marginTop: 18 }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}><thead><tr>{["User", "Change", "Changed by", "Reason", "Time"].map((heading) => <th key={heading} style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #e5e7eb", color: "var(--muted)", fontSize: 12 }}>{heading}</th>)}</tr></thead><tbody>{roleHistory.map((entry) => { const user = users.find((item) => item.id === entry.user_id); const actor = actorMap.get(entry.changed_by); return <tr key={entry.id}><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9" }}>{user?.full_name ?? entry.user_id}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>{entry.previous_role ?? "none"} → {entry.new_role}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9" }}>{actor?.full_name ?? "Administrator"}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9", color: "var(--muted)" }}>{entry.reason ?? "—"}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap", color: "var(--muted)", fontSize: 12 }}>{formatDate(entry.created_at)}</td></tr>; })}{!roleHistory.length && <tr><td colSpan={5} style={{ padding: 20, color: "var(--muted)" }}>No role changes recorded yet.</td></tr>}</tbody></table></div>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <p className="eyebrow" style={{ marginTop: 0 }}>Login activity</p><h2 style={{ margin: "8px 0 0" }}>Recent authentication events</h2>
        <div style={{ overflowX: "auto", marginTop: 18 }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}><thead><tr>{["Identifier", "Event", "Result", "Reason", "Time"].map((heading) => <th key={heading} style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #e5e7eb", color: "var(--muted)", fontSize: 12 }}>{heading}</th>)}</tr></thead><tbody>{logins.map((login) => <tr key={login.id}><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9" }}>{login.identifier ?? "Account"}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9" }}>{login.event_type.replaceAll("_", " ")}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>{login.success ? "Success" : "Failed"}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9", color: "var(--muted)" }}>{login.failure_reason ?? "—"}</td><td style={{ padding: "14px 8px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap", color: "var(--muted)", fontSize: 12 }}>{formatDate(login.created_at)}</td></tr>)}{!logins.length && <tr><td colSpan={5} style={{ padding: 20, color: "var(--muted)" }}>No login activity recorded yet.</td></tr>}</tbody></table></div>
      </section>
    </div>
  );
}
