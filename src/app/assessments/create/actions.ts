"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export async function createAssessment(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!["mentor", "administrator"].includes(profile.role)) throw new Error("Only mentors and administrators can create assessments.");
  const title = String(formData.get("title") ?? "").trim();
  const skillId = String(formData.get("skill_id") ?? "");
  const instructions = String(formData.get("instructions") ?? "").trim();
  const criteria = String(formData.get("criteria") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "beginner");
  const rawDeadline = String(formData.get("deadline") ?? "").trim();
  if (title.length < 3 || !skillId || !instructions || !criteria || !["beginner", "intermediate", "advanced"].includes(difficulty)) throw new Error("Complete all assessment fields.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("assessments").insert({ title, skill_id: skillId, instructions, criteria, difficulty, deadline: rawDeadline ? new Date(rawDeadline).toISOString() : null, created_by_id: profile.id }).select("id").single();
  if (error) throw new Error(error.message);
  redirect(`/assessments/${data.id}`);
}
