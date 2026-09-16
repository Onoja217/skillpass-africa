import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { Profile } from "@/types/database";

export const adminPermissions = [
  "users.view",
  "users.manage",
  "roles.manage",
  "verifications.review",
  "audit.view",
  "reports.view",
  "settings.manage",
] as const;

export type AdminPermission = (typeof adminPermissions)[number];

export async function requireAdministrator(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (profile.role !== "administrator") redirect(`/dashboard/${profile.role}`);
  return profile;
}

export async function hasAdminPermission(permission: AdminPermission): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_admin_permission", {
    required_permission: permission,
  });

  return !error && data === true;
}

export async function requireAdminPermission(permission: AdminPermission): Promise<Profile> {
  const profile = await requireAdministrator();
  const allowed = await hasAdminPermission(permission);
  if (!allowed) redirect("/dashboard/administrator?error=Permission%20required");
  return profile;
}
