import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { savePortfolioItem, updatePortfolioItem, deletePortfolioItem } from "@/app/portfolio/actions";
import { calculatePortfolioProgress } from "@/lib/portfolio-progress";

type PortfolioItem = { id: string; title: string; description: string | null; is_public: boolean; submission_id: string | null; submissions: { status: string } | null };
type VerifiedSubmission = { id: string; assessment_id: string; assessments: { title: string } | null };

export default async function PortfolioPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const [{ data: items }, { data: verifiedSubmissions }] = await Promise.all([
    supabase.from("portfolio_items").select("id,title,description,is_public,submission_id,submissions(status)").eq("learner_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("submissions").select("id,assessment_id,assessments(title)").eq("learner_id", profile.id).eq("status", "verified").order("reviewed_at", { ascending: false }),
  ]);
  const portfolioItems = (items ?? []) as PortfolioItem[];
  const verified = (verifiedSubmissions ?? []) as VerifiedSubmission[];
  const progress = calculatePortfolioProgress({
    hasProfile: Boolean(profile.full_name && profile.biography),
    hasSkills: profile.selected_skills.length > 0,
    hasPortfolioItem: portfolioItems.length > 0,
    hasVerifiedSkill: verified.length > 0,
  });
  return <main className="shell" style={{ paddingBlock: 30, display: "grid", gap: 20 }}>
    <section><p className="eyebrow">Your evidence</p><h1>Learner portfolio</h1><p style={{ color: "var(--muted)" }}>Choose which completed work is visible publicly. Verified submissions can be presented as verified evidence.</p></section>
    <section className="card" aria-label="Portfolio completion" style={{ padding: 22, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}><div><strong>{progress.label}</strong><p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{progress.completed} of {progress.total} portfolio milestones completed</p></div><strong style={{ fontSize: 30 }}>{progress.percentage}%</strong></div>
      <div role="progressbar" aria-label="Portfolio completion percentage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage} style={{ height: 12, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}><div style={{ width: `${progress.percentage}%`, height: "100%", background: "var(--green)", borderRadius: 999 }} /></div>
      <ul style={{ margin: 0, paddingLeft: 20 }}><li>{profile.full_name && profile.biography ? "✓" : "○"} Complete your profile</li><li>{profile.selected_skills.length ? "✓" : "○"} Add at least one skill</li><li>{portfolioItems.length ? "✓" : "○"} Add a portfolio project</li><li>{verified.length ? "✓" : "○"} Get a skill verified by a mentor</li></ul>
    </section>
    <form action={savePortfolioItem} className="card" style={{ padding: 22, display: "grid", gap: 14 }}><h2>Add portfolio item</h2><div className="field"><label htmlFor="title">Project title</label><input id="title" name="title" required maxLength={160} /></div><div className="field"><label htmlFor="description">Description</label><textarea id="description" name="description" rows={4} maxLength={2000} /></div><div className="field"><label htmlFor="submission_id">Verified submission</label><select id="submission_id" name="submission_id"><option value="">Independent portfolio item</option>{verified.map((item) => <option key={item.id} value={item.id}>{item.assessments?.title ?? "Verified assessment"}</option>)}</select></div><label><input type="checkbox" name="is_public" /> Make public</label><button className="button" type="submit">Add portfolio item</button></form>
    <section style={{ display: "grid", gap: 14 }} aria-label="Your portfolio items">{portfolioItems.map((item) => <article className="card" style={{ padding: 20, display: "grid", gap: 14 }} key={item.id}><div><h2>{item.title}</h2><p>{item.description || "No description provided."}</p><p>{item.submissions?.status === "verified" ? "✓ Verified evidence" : "Project evidence"} · {item.is_public ? "Public" : "Private"}</p></div><details><summary>Edit portfolio item</summary><form action={updatePortfolioItem} style={{ display: "grid", gap: 12, marginTop: 14 }}><input type="hidden" name="id" value={item.id} /><div className="field"><label htmlFor={`title-${item.id}`}>Project title</label><input id={`title-${item.id}`} name="title" defaultValue={item.title} required maxLength={160} /></div><div className="field"><label htmlFor={`description-${item.id}`}>Description</label><textarea id={`description-${item.id}`} name="description" rows={4} defaultValue={item.description ?? ""} maxLength={2000} /></div><div className="field"><label htmlFor={`submission-${item.id}`}>Verified submission</label><select id={`submission-${item.id}`} name="submission_id" defaultValue={item.submission_id ?? ""}><option value="">Independent portfolio item</option>{verified.map((submission) => <option key={submission.id} value={submission.id}>{submission.assessments?.title ?? "Verified assessment"}</option>)}</select></div><label><input type="checkbox" name="is_public" defaultChecked={item.is_public} /> Make public</label><button className="button" type="submit">Save changes</button></form></details><form action={deletePortfolioItem}><input type="hidden" name="id" value={item.id} /><button type="submit">Delete portfolio item</button></form></article>)}</section>
  </main>;
}
