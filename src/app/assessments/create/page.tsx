import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAssessment } from "@/app/assessments/create/actions";

export default async function CreateAssessmentPage() {
  const profile = await getCurrentProfile();
  if (!["mentor", "administrator"].includes(profile.role)) redirect("/assessments");
  const supabase = await createClient();
  const { data: skills } = await supabase.from("skills").select("id,name,categories(name)").order("name");
  return <main className="shell" style={{ paddingBlock: 30, maxWidth: 850 }}><p className="eyebrow">Mentor workspace</p><h1>Create practical assessment</h1><form action={createAssessment} className="card" style={{ padding: 24, display: "grid", gap: 16 }}><div className="field"><label htmlFor="title">Title</label><input id="title" name="title" required maxLength={160} /></div><div className="field"><label htmlFor="skill_id">Skill</label><select id="skill_id" name="skill_id" required><option value="">Select skill</option>{(skills ?? []).map((skill: any) => <option key={skill.id} value={skill.id}>{skill.name} · {skill.categories?.name}</option>)}</select></div><div className="field"><label htmlFor="instructions">Instructions</label><textarea id="instructions" name="instructions" rows={7} required /></div><div className="field"><label htmlFor="criteria">Assessment criteria</label><textarea id="criteria" name="criteria" rows={5} required /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><div className="field"><label htmlFor="difficulty">Difficulty</label><select id="difficulty" name="difficulty"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div><div className="field"><label htmlFor="deadline">Deadline</label><input id="deadline" name="deadline" type="datetime-local" /></div></div><button className="button" type="submit">Publish assessment</button></form></main>;
}
