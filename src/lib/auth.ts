import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error || !profile) redirect("/login?error=Profile%20not%20found");
  if (profile.account_status === "suspended") {
    await supabase.auth.signOut();
    redirect("/login?error=Account%20suspended");
  }
  return profile;
});
