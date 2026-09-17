"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "@/app/auth/actions";

const profileSchema = z.object({ full_name: z.string().trim().min(2, "Full name is required").max(100), phone: z.string().trim().max(30), location: z.string().trim().max(100), biography: z.string().trim().max(600), selected_skills: z.string().transform((value) => value.split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 20)) });

export async function updateProfile(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(["full_name", "phone", "location", "biography", "selected_skills"].map((key) => [key, formData.get(key) ?? ""])));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Please sign in again." };
  let avatarUrl: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
    const extension = allowed.get(avatar.type);
    if (!extension || avatar.size > 2 * 1024 * 1024) return { error: "Use a JPG, PNG, or WebP image smaller than 2 MB." };
    const path = `${user.id}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatar, { upsert: true, contentType: avatar.type });
    if (uploadError) return { error: uploadError.message };
    avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }
  const payload = avatarUrl ? { ...parsed.data, avatar_url: avatarUrl } : parsed.data;
  const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/profile"); revalidatePath("/dashboard");
  return { success: "Profile updated successfully." };
}
