"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export async function applyToOpportunity(opportunityId: string, coverNote?: string) {
  const profile = await getCurrentProfile();

  if (profile.role !== "learner") {
    throw new Error("Only learners can apply to opportunities.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .insert({
      opportunity_id: opportunityId,
      learner_id: profile.id,
      cover_note: coverNote ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("You've already applied to this opportunity.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/opportunities");
  return data;
}
export async function getMyApplicationIds() {
  const profile = await getCurrentProfile();

  if (profile.role !== "learner") {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .select("opportunity_id")
    .eq("learner_id", profile.id);

  if (error) {
    throw new Error(error.message);
  }

  return data.map((row) => row.opportunity_id);
}