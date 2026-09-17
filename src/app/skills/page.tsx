import { createClient } from "@/lib/supabase/server";

type CategoryOption = { id: string; name: string };
type SkillCard = { id: string; name: string; description: string | null; category_id: string; categories: { name: string } | null };

export default async function SkillsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q = "", category = "" } = await searchParams;
  const supabase = await createClient();
  const [{ data: categories }, { data: skills }] = await Promise.all([
    supabase.from("categories").select("id,name").order("name"),
    supabase.from("skills").select("id,name,description,category_id,categories(name)").order("name"),
  ]);
  const categoryOptions = (categories ?? []) as CategoryOption[];
  const skillCards = (skills ?? []) as SkillCard[];
  const filtered = skillCards.filter((skill) => (!q || `${skill.name} ${skill.description ?? ""}`.toLowerCase().includes(q.toLowerCase())) && (!category || skill.category_id === category));
  return <main className="shell" style={{ paddingBlock: 30, display: "grid", gap: 20 }}><section><p className="eyebrow">SkillPass directory</p><h1>Skills catalogue</h1><p style={{ color: "var(--muted)" }}>Explore practical skills and discover assessments that can help you prove them.</p></section><form className="card" style={{ padding: 18, display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 12 }}><input name="q" defaultValue={q} placeholder="Search skills" aria-label="Search skills" /><select name="category" defaultValue={category} aria-label="Filter skills by category"><option value="">All categories</option>{categoryOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="button" type="submit">Search</button></form><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>{filtered.map((skill) => <article className="card" style={{ padding: 20 }} key={skill.id}><p className="eyebrow">{skill.categories?.name}</p><h2>{skill.name}</h2><p style={{ color: "var(--muted)" }}>{skill.description || "Practical skill available for assessment."}</p></article>)}{!filtered.length ? <div className="card" style={{ padding: 20 }}>No matching skills found.</div> : null}</section></main>;
}
