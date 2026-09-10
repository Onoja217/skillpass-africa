import { getCurrentProfile } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";
import { SiteHeader } from "@/components/site-header";
export default async function ProfilePage() { const profile = await getCurrentProfile(); return <><SiteHeader /><main className="shell" style={{ paddingBlock: 30, display: "grid", gap: 20 }}><div><p className="eyebrow">Your account</p><h1 style={{ fontSize: 38, margin: "8px 0" }}>Profile</h1><p style={{ color: "var(--muted)" }}>Keep your SkillPass accurate and ready to share.</p></div><ProfileForm profile={profile} /></main></>; }
