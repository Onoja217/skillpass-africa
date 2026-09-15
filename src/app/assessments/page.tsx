import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q = "", category = "" } = await searchParams;
  const supabase = await createClient();
  const [{ data: categories }, { data: assessments }] = await Promise.all([
    supabase.from("categories").select("id,name").order("name"),
    supabase.from("assessments").select("id,title,difficulty,deadline,criteria,skills(name,categories(name))").order("created_at", { ascending: false }),
  ]);
  const filtered = (assessments ?? []).filter((assessment: any) => {
    const skill = assessment.skills?.name ?? "";
    const cat = assessment.skills?.categories?.name ?? "";
    return (!q || `${assessment.title} ${skill} ${cat}`.toLowerCase().includes(q.toLowerCase())) && (!category || cat === category);
  });
  return <main className="shell" style={{ paddingBlock: 30, display: "grid", gap: 20 }}>
    <section><p className="eyebrow">Practical learning</p><h1>Skills assessments</h1><p style={{ color: "var(--muted)" }}>Find practical assessments and build evidence of what you can do.</p></section>
    <form className="card" style={{ padding: 18, display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 12 }}>
      <input name="q" defaultValue={q} placeholder="Search assessments, skills or categories" aria-label="Search assessments" />
      <select name="category" defaultValue={category} aria-label="Filter by category"><option value="">All categories</option>{(categories ?? []).map((item: any) => <option key={item.id} value={item.name}>{item.name}</option>)}</select>
      <button className="button" type="submit">Search</button>
    </form>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
      {filtered.length ? filtered.map((assessment: any) => <article className="card" style={{ padding: 22 }} key={assessment.id}><p className="eyebrow">{assessment.skills?.categories?.name ?? "Skill"} · {assessment.difficulty}</p><h2 style={{ marginTop: 8 }}>{assessment.title}</h2><p style={{ color: "var(--muted)" }}>{assessment.skills?.name}</p><p>{assessment.criteria}</p>{assessment.deadline ? <small>Deadline: {new Date(assessment.deadline).toLocaleDateString()}</small> : <small>No deadline</small>}<div><Link className="button" href={`/assessments/${assessment.id}`} style={{ marginTop: 16 }}>View assessment</Link></div></article>) : <div className="card" style={{ padding: 24 }}><h2>No assessments found</h2><p>Try another search or category.</p></div>}
    </section>
  </main>;
}
