import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

function StatCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <article className="card" style={{ padding: 22 }}>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>{label}</p>
      <strong style={{ display: "block", fontSize: 34, lineHeight: 1.1, marginTop: 8 }}>{value}</strong>
      <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 13 }}>{detail}</p>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "active"
      ? { background: "#dcfce7", color: "#166534" }
      : status === "suspended"
        ? { background: "#fef3c7", color: "#92400e" }
        : { background: "#fee2e2", color: "#991b1b" };

  return (
    <span style={{ ...tone, display: "inline-flex", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 800, textTransform: "capitalize" }}>
      {status}
    </span>
  );
}

export default async function AdministratorDashboardPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "administrator") redirect(`/dashboard/${profile.role}`);

  const supabase = await createClient();

  const [
    usersResult,
    learnersResult,
    mentorsResult,
    employersResult,
    pendingMentorsResult,
    submissionsResult,
    pendingSubmissionsResult,
    verificationsResult,
    activeVerificationsResult,
    suspendedVerificationsResult,
    recentVerificationsResult,
  ] = await Promise.all([
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
    supabase
      .from("skill_verifications")
      .select("id, decision, competency_rating, verified_at, public_verification_id, verification_status")
      .order("verified_at", { ascending: false })
      .limit(5),
  ]);

  const errors = [
    usersResult.error,
    learnersResult.error,
    mentorsResult.error,
    employersResult.error,
    pendingMentorsResult.error,
    submissionsResult.error,
    pendingSubmissionsResult.error,
    verificationsResult.error,
    activeVerificationsResult.error,
    suspendedVerificationsResult.error,
    recentVerificationsResult.error,
  ].filter(Boolean);

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
    <div style={{ display: "grid", gap: 28 }}>
      <section>
        <p className="eyebrow">Administrator dashboard</p>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-.045em", margin: "10px 0" }}>
          Platform overview
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 17, maxWidth: 720 }}>
          Monitor SkillPass Africa users, learner submissions, mentor activity, and the integrity of verified skills from one place.
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }} aria-label="Platform statistics">
        <StatCard label="Total users" value={users} detail={`${learners} learners · ${mentors} mentors · ${employers} employers`} />
        <StatCard label="Submissions" value={submissions} detail={`${pendingSubmissions} awaiting review`} />
        <StatCard label="Verifications" value={verifications} detail={`${activeVerifications} active`} />
        <StatCard label="Pending mentors" value={pendingMentors} detail="Applications needing attention" />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <article className="card" style={{ padding: 24 }}>
          <p className="eyebrow" style={{ marginTop: 0 }}>Verification health</p>
          <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span>Active</span><strong>{activeVerifications}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span>Suspended</span><strong>{suspendedVerifications}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span>Revoked</span><strong>{Math.max(verifications - activeVerifications - suspendedVerifications, 0)}</strong></div>
          </div>
          <Link className="button" href="/dashboard/administrator/verifications" style={{ marginTop: 20 }}>Open verification controls</Link>
        </article>

        <article className="card" style={{ padding: 24 }}>
          <p className="eyebrow" style={{ marginTop: 0 }}>Quick actions</p>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <Link className="button" href="/dashboard/administrator/verifications">Review verification records</Link>
            <Link className="button secondary" href="/profile">Review administrator profile</Link>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 0, marginTop: 16 }}>
            Administrator access is role-gated at both the application and database layers.
          </p>
        </article>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Recent verification activity</p>
            <h2 style={{ margin: "8px 0 0" }}>Latest records</h2>
          </div>
          <Link className="button secondary" href="/dashboard/administrator/verifications">View all</Link>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          {recentVerificationsResult.data?.length ? recentVerificationsResult.data.map((verification) => (
            <div key={verification.id} style={{ display: "grid", gridTemplateColumns: "minmax(150px, 1fr) auto auto", alignItems: "center", gap: 16, paddingBlock: 14, borderTop: "1px solid #e5e7eb" }}>
              <div>
                <strong>{verification.public_verification_id ?? "Pending public ID"}</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
                  Decision: {verification.decision} · Rating: {verification.competency_rating ?? "—"}/5
                </p>
              </div>
              <StatusPill status={verification.verification_status} />
              <span style={{ color: "var(--muted)", fontSize: 12 }}>
                {new Date(verification.verified_at).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
          )) : (
            <p style={{ color: "var(--muted)", marginBottom: 0 }}>No verification records have been created yet.</p>
          )}
        </div>
      </section>

      <section className="notice" style={{ background: "rgba(216,239,131,.35)", color: "var(--ink)" }}>
        <strong>Security status:</strong> public administrator registration remains disabled. Your administrator account is provisioned through Supabase Auth and the profile role, while verification changes are protected by administrator RLS policies.
      </section>
    </div>
  );
}
