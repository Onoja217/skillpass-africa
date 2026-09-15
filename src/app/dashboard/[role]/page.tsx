import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { dashboardPath, roleDetails } from "@/lib/roles";
import { roles, type UserRole } from "@/types/database";

const roleContent: Record<UserRole, { title: string; metric: string; value: string; items: string[] }> = {
  learner: { title: "Your skills journey", metric: "Profile strength", value: "Get started", items: ["Add your practical skills", "Complete your biography", "Share evidence with a mentor"] },
  mentor: { title: "Verification workspace", metric: "Pending reviews", value: "0", items: ["Review learner evidence", "Record a fair assessment", "Help learners strengthen their profile"] },
  employer: { title: "Talent workspace", metric: "Saved candidates", value: "0", items: ["Discover skills-first talent", "Create a candidate shortlist", "Connect around real opportunities"] },
  administrator: { title: "Platform overview", metric: "System status", value: "Healthy", items: ["Manage user access", "Monitor verification quality", "Support the SkillPass community"] },
};

export default async function RoleDashboard({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!roles.includes(role as UserRole)) notFound();
  const profile = await getCurrentProfile();
  if (profile.role !== role) redirect(dashboardPath(profile.role));
  const content = roleContent[profile.role];
  return <div style={{ display: "grid", gap: 24 }}>
    <section><p className="eyebrow">{roleDetails[profile.role].label} dashboard</p><h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-.045em", margin: "10px 0" }}>Hello, {profile.full_name.split(" ")[0]}.</h1><p style={{ color: "var(--muted)", fontSize: 17 }}>{content.title}</p></section>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}><div className="card" style={{ padding: 24 }}><span style={{ color: "var(--muted)" }}>{content.metric}</span><strong style={{ display: "block", fontSize: 28, marginTop: 8 }}>{content.value}</strong></div><div className="card" style={{ padding: 24 }}><span style={{ color: "var(--muted)" }}>Skills listed</span><strong style={{ display: "block", fontSize: 28, marginTop: 8 }}>{profile.selected_skills.length}</strong></div></section>
    <section className="card" style={{ padding: 24 }}><h2 style={{ marginTop: 0 }}>Next steps</h2><div style={{ display: "grid", gap: 10 }}>{content.items.map((item, index) => <div key={item} style={{ display: "flex", gap: 12, paddingBlock: 10, borderBottom: "1px solid #e5e7eb" }}><strong style={{ color: "var(--green)" }}>{index + 1}</strong><span>{item}</span></div>)}</div><div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
      <Link className="button" href="/profile">Complete your profile</Link>
      {profile.role === "mentor" && (
        <Link className="button" href="/dashboard/mentor/reviews">
          Review learner submissions
        </Link>
      )}
    </div></section>
  </div>;
}
