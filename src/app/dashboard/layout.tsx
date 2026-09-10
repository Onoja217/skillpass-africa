import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { roleDetails } from "@/lib/roles";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  return <div style={{ minHeight: "100vh", display: "grid", gridTemplateRows: "auto 1fr" }}>
    <header style={{ background: "var(--ink)", color: "white" }}><div className="shell" style={{ minHeight: 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><Link href="/dashboard" style={{ fontSize: 20, fontWeight: 900 }}>SkillPass <span style={{ color: "var(--lime)" }}>Africa</span></Link><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="desktop-only" style={{ color: "#cbd5d1" }}>{roleDetails[profile.role].label}</span><LogoutButton /></div></div></header>
    <div className="shell" style={{ display: "grid", gridTemplateColumns: "minmax(190px, 240px) 1fr", gap: 28, paddingBlock: 30 }}>
      <aside className="desktop-only"><nav aria-label="Dashboard navigation" className="card" style={{ padding: 12, display: "grid", gap: 5 }}><Link href="/dashboard" style={{ padding: 12, borderRadius: 10, fontWeight: 750 }}>Overview</Link><Link href="/profile" style={{ padding: 12, borderRadius: 10, fontWeight: 750 }}>Edit profile</Link></nav></aside>
      <main style={{ minWidth: 0 }}>{children}</main>
    </div>
  </div>;
}
