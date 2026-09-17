import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateUserAccess } from "./actions";
import type { UserRole } from "@/types/database";

const roles: UserRole[] = ["learner", "mentor", "employer", "administrator"];

function statusStyle(status: string) {
  return status === "active"
    ? { background: "#dcfce7", color: "#166534" }
    : { background: "#fef3c7", color: "#92400e" };
}

export default async function AdministratorUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile.role !== "administrator") redirect(`/dashboard/${profile.role}`);

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const roleFilter = roles.includes(params.role as UserRole) ? (params.role as UserRole) : "";
  const statusFilter = params.status === "active" || params.status === "suspended" ? params.status : "";
  const supabase = await createClient();

  let usersQuery = supabase
    .from("profiles")
    .select("id, full_name, email, role, mentor_status, account_status, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (query) usersQuery = usersQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
  if (roleFilter) usersQuery = usersQuery.eq("role", roleFilter);
  if (statusFilter) usersQuery = usersQuery.eq("account_status", statusFilter);

  const [{ data: users, error: usersError }, { data: history, error: historyError }] = await Promise.all([
    usersQuery,
    supabase.from("role_history").select("id, user_id, previous_role, new_role, changed_by, reason, created_at").order("created_at", { ascending: false }).limit(100),
  ]);

  if (usersError || historyError) throw new Error("Unable to load administrator user management.");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section>
        <p className="eyebrow">Administrator controls</p>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-.045em", margin: "10px 0" }}>Users & roles</h1>
        <p style={{ color: "var(--muted)", fontSize: 17, maxWidth: 760 }}>Manage account access and roles without changing the existing platform experience. Every role or suspension change is recorded for accountability.</p>
      </section>

      <section className="card" style={{ padding: 20 }}>
        <form method="get" style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) repeat(2, minmax(150px, .35fr)) auto", gap: 10, alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>Search<input name="q" defaultValue={query} placeholder="Name or email" style={{ width: "100%" }} /></label>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>Role<select name="role" defaultValue={roleFilter}><option value="">All roles</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>Status<select name="status" defaultValue={statusFilter}><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
          <button className="button" type="submit">Filter</button>
        </form>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div><p className="eyebrow" style={{ margin: 0 }}>Directory</p><h2 style={{ margin: "8px 0 0" }}>{users?.length ?? 0} users shown</h2></div>
          <Link className="button secondary" href="/dashboard/administrator/audit">Audit activity</Link>
        </div>
        <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
          {users?.map((user) => {
            const isSelf = user.id === profile.id;
            const userHistory = history?.filter((entry) => entry.user_id === user.id).slice(0, 3) ?? [];
            return (
              <article key={user.id} style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16, display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) auto auto", gap: 16, alignItems: "center" }}>
                  <div><strong>{user.full_name}</strong><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{user.email}</div><div style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>Joined {new Date(user.created_at).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}{user.mentor_status ? ` · Mentor: ${user.mentor_status}` : ""}</div></div>
                  <span style={{ padding: "6px 10px", borderRadius: 999, background: "#f3f4f6", fontSize: 12, fontWeight: 800, textTransform: "capitalize" }}>{user.role}</span>
                  <span style={{ ...statusStyle(user.account_status), padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: "capitalize" }}>{user.account_status}</span>
                </div>
                {isSelf ? <div className="notice">Your own role and account status cannot be changed from this control to prevent administrator lockout.</div> : (
                  <form action={updateUserAccess} style={{ display: "grid", gridTemplateColumns: "minmax(140px, .3fr) minmax(140px, .3fr) minmax(180px, 1fr) auto", gap: 10, alignItems: "end" }}>
                    <input type="hidden" name="user_id" value={user.id} />
                    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Role<select name="role" defaultValue={user.role}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
                    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Status<select name="account_status" defaultValue={user.account_status}><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
                    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Reason<input name="reason" maxLength={500} placeholder="Why is this change needed?" /></label>
                    <button className="button" type="submit">Save access</button>
                  </form>
                )}
                {userHistory.length > 0 && <details><summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Role history ({userHistory.length})</summary><div style={{ display: "grid", gap: 8, marginTop: 10 }}>{userHistory.map((entry) => <div key={entry.id} style={{ fontSize: 12, color: "var(--muted)" }}>{entry.previous_role ?? "none"} → {entry.new_role} · {new Date(entry.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}{entry.reason ? ` · ${entry.reason}` : ""}</div>)}</div></details>}
              </article>
            );
          })}
          {!users?.length && <p style={{ color: "var(--muted)", marginBottom: 0 }}>No users match the selected filters.</p>}
        </div>
      </section>

      <section className="notice" style={{ background: "rgba(216,239,131,.35)", color: "var(--ink)" }}><strong>Security:</strong> role and account-status changes go through an administrator-only database function. Administrators cannot modify their own access, and the platform prevents removing the last administrator.</section>
    </div>
  );
}
