
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { OpportunityType, WorkArrangement } from "@/types/database";

export async function createOpportunity(formData: {
  title: string;
  organization: string;
  description: string;
  opportunity_type: OpportunityType;
  required_skills: string[];
  location?: string;
  work_arrangement: WorkArrangement;
  application_deadline?: string;
  application_instructions?: string;
}) {
  const profile = await getCurrentProfile();

  if (profile.role !== "employer") {
    throw new Error("Only employers can create opportunities.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      employer_id: profile.id,
      title: formData.title,
      organization: formData.organization,
      description: formData.description,
      opportunity_type: formData.opportunity_type,
      required_skills: formData.required_skills,
      location: formData.location ?? null,
      work_arrangement: formData.work_arrangement,
      application_deadline: formData.application_deadline ?? null,
      application_instructions: formData.application_instructions ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/employer");
  return data;
}
export async function listOpportunities() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}