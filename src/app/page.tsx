import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return <><SiteHeader /><main>
    <section className="shell" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 48, alignItems: "center", paddingBlock: "clamp(4rem,10vw,8rem)" }}>
      <div><p className="eyebrow">Proof beyond certificates</p><h1 style={{ fontSize: "clamp(2.8rem,7vw,5.8rem)", lineHeight: .94, letterSpacing: "-.065em", margin: "18px 0 24px" }}>Skills that open doors.</h1><p style={{ color: "var(--muted)", fontSize: 19, lineHeight: 1.65, maxWidth: 590 }}>Build a credible record of what you can do, get verified by trusted mentors, and connect with employers across Africa.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}><Link className="button" href="/register">Build your SkillPass</Link><Link className="button secondary" href="/login">Sign in</Link></div></div>
      <div className="card" style={{ padding: 28, background: "var(--green)", color: "white", transform: "rotate(1deg)" }}><p className="eyebrow" style={{ color: "var(--lime)" }}>Digital skills passport</p><h2 style={{ fontSize: 32, marginBlock: 18 }}>One profile. Real evidence. Trusted potential.</h2><div style={{ display: "grid", gap: 12 }}>{["Showcase practical skills", "Receive mentor verification", "Be discovered by employers"].map((item, i) => <div key={item} style={{ display: "flex", gap: 12, padding: 15, borderRadius: 14, background: "rgba(255,255,255,.1)" }}><strong style={{ color: "var(--lime)" }}>0{i + 1}</strong><span>{item}</span></div>)}</div></div>
    </section>
  </main></>;
}
