import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateRolePermission } from "./actions";
import type { UserRole } from "@/types/database";

const roles: UserRole[] = ["learner", "mentor", "employer", "administrator"];

export default async function AdministratorPermissionsPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "administrator") redirect(`/dashboard/${profile.role}`);

  const supabase = await createClient();
  const [{ data: permissions, error: permissionsError }, { data: assignments, error: assignmentsError }] = await Promise.all([
    supabase.from("admin_permissions").select("id, permission_key, name, description").order("permission_key"),
    supabase.from("role_permissions").select("role, permission_id"),
  ]);

  if (permissionsError || assignmentsError) throw new Error("Unable to load administrator permissions.");

  const granted = new Set((assignments ?? []).map((assignment) => `${assignment.role}:${assignment.permission_id}`));

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
        <div><p className="eyebrow">Administrator controls</p><h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-.045em", margin: "10px 0" }}>Permissions</h1><p style={{ color: "var(--muted)", fontSize: 17, maxWidth: 760 }}>Control which administrator capabilities are available to each role. Changes are enforced by the database and recorded in the audit center.</p></div>
        <Link className="button secondary" href="/dashboard/administrator/audit">Audit activity</Link>
      </section>

      <section className="card" style={{ padding: 24, overflowX: "auto" }}>
        <div style={{ minWidth: 760 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1.2fr) repeat(4, minmax(110px, .5fr))", gap: 12, alignItems: "center", paddingBottom: 12, borderBottom: "1px solid #e5e7eb" }}>
            <strong>Permission</strong>{roles.map((role) => <strong key={role} style={{ textTransform: "capitalize", fontSize: 13 }}>{role}</strong>)}
          </div>
          <div style={{ display: "grid" }}>
            {(permissions ?? []).map((permission) => (
              <div key={permission.id} style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1.2fr) repeat(4, minmax(110px, .5fr))", gap: 12, alignItems: "center", padding: "16px 0", borderBottom: "1px solid #e5e7eb" }}>
                <div><strong>{permission.name}</strong><div style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>{permission.permission_key}</div><div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>{permission.description}</div></div>
                {roles.map((role) => {
                  const isEnabled = granted.has(`${role}:${permission.id}`);
                  const isProtected = role === "administrator" && permission.permission_key === "roles.manage";
                  return (
                    <form key={role} action={updateRolePermission}>
                      <input type="hidden" name="role" value={role} />
                      <input type="hidden" name="permission" value={permission.permission_key} />
                      <input type="hidden" name="enabled" value={String(!isEnabled)} />
                      <button className={isEnabled ? "button" : "button secondary"} type="submit" disabled={isProtected} title={isProtected ? "The administrator role must retain permission management access." : undefined} style={{ width: "100%", fontSize: 12 }}>
                        {isEnabled ? "Enabled" : "Disabled"}
                      </button>
                    </form>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="notice" style={{ background: "rgba(216,239,131,.35)", color: "var(--ink)" }}><strong>Security:</strong> permission changes require an authenticated administrator with <code>roles.manage</code>. The administrator role cannot lose its own permission-management access, preventing accidental lockout.</section>
    </div>
  );
}
