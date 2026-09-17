"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export async function searchLearners(filters: { skill?: string; location?: string }) {
  const profile = await getCurrentProfile();

  if (profile.role !== "employer") {
    throw new Error("Only employers can search learners.");
  }

  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, location, biography, selected_skills")
    .eq("role", "learner");

  if (filters.skill) {
    query = query.contains("selected_skills", [filters.skill]);
  }

  if (filters.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }

  const { data, error } = await query.order("full_name");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}