import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { dashboardPath } from "@/lib/roles";

export default async function DashboardIndex() { const profile = await getCurrentProfile(); redirect(dashboardPath(profile.role)); }
