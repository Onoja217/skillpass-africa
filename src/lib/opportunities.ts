
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

export async function listMyOpportunities() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("employer_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function togglePublish(opportunityId: string, publish: boolean) {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .update({ is_published: publish })
    .eq("id", opportunityId)
    .eq("employer_id", profile.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/employer");
  revalidatePath("/opportunities");
  return data;
}
export async function updateOpportunity(
  opportunityId: string,
  formData: {
    title: string;
    organization: string;
    description: string;
    opportunity_type: OpportunityType;
    required_skills: string[];
    location?: string;
    work_arrangement: WorkArrangement;
    application_deadline?: string;
    application_instructions?: string;
  }
) {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .update({
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
    .eq("id", opportunityId)
    .eq("employer_id", profile.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/employer/opportunities");
  revalidatePath("/opportunities");
  return data;
}

export async function getOpportunity(opportunityId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", opportunityId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
export async function listAllOpportunitiesForAdmin() {
  const profile = await getCurrentProfile();

  if (profile.role !== "administrator") {
    throw new Error("Only administrators can view all opportunities.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
export async function adminSetPublishStatus(opportunityId: string, publish: boolean) {
  const profile = await getCurrentProfile();

  if (profile.role !== "administrator") {
    throw new Error("Only administrators can moderate opportunities this way.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .update({ is_published: publish })
    .eq("id", opportunityId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/administrator");
  revalidatePath("/opportunities");
  return data;
}