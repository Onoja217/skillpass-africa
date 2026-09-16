"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dashboardPath } from "@/lib/roles";
import { roles } from "@/types/database";

export type AuthState = { error?: string; success?: string };
const selfServiceRoles = roles.filter((role) => role !== "administrator") as ["learner", "mentor", "employer"];
const credentials = z.object({ email: z.string().email(), password: z.string().min(8, "Password must be at least 8 characters") });

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.extend({ fullName: z.string().trim().min(2).max(100), role: z.enum(selfServiceRoles) }).safeParse({ email: formData.get("email"), password: formData.get("password"), fullName: formData.get("fullName"), role: formData.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { emailRedirectTo: `${siteUrl}/auth/callback`, data: { full_name: parsed.data.fullName, role: parsed.data.role } } });
  return error ? { error: error.message } : { success: "Check your email to verify your account, then sign in." };
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: error?.message ?? "Unable to sign in" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (!profile) return { error: "Your profile is not ready. Please contact support." };
  redirect(dashboardPath(profile.role));
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address" };
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${siteUrl}/auth/callback?next=/reset-password` });
  return error ? { error: error.message } : { success: "If that account exists, a reset link is on its way." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = z.string().min(8, "Password must be at least 8 characters").safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  return error ? { error: error.message } : { success: "Password updated. You can continue to your dashboard." };
}

export async function logout() { const supabase = await createClient(); await supabase.auth.signOut(); redirect("/login"); }
