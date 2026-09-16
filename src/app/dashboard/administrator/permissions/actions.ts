"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

const roles: UserRole[] = ["learner", "mentor", "employer", "administrator"];

export async function updateRolePermission(formData: FormData) {
  const role = String(formData.get("role") ?? "") as UserRole;
  const permission = String(formData.get("permission") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";

  if (!roles.includes(role) || !/^[a-z]+(\.[a-z]+)+$/.test(permission)) {
    throw new Error("Invalid permission settings.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role_permission", {
    target_role: role,
    permission_key: permission,
    enabled,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/administrator/permissions");
  revalidatePath("/dashboard/administrator/audit");
}
