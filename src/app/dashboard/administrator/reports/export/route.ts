import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: unknown) { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const parsedFrom = from ? new Date(from) : null;
  const parsedTo = to ? new Date(to) : null;
  if (!parsedFrom || !parsedTo || Number.isNaN(parsedFrom.getTime()) || Number.isNaN(parsedTo.getTime()) || parsedFrom >= parsedTo) return new Response("Invalid report period", { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_reports", { p_from: parsedFrom.toISOString(), p_to: parsedTo.toISOString() });
  if (error) return new Response("Reports access denied or unavailable", { status: error.code === "42501" ? 403 : 500 });
  const report = data as { overview: Record<string, number>; period_activity: Record<string, number>; verification: Record<string, number>; submissions: Record<string, number>; security: Record<string, number>; user_roles: Record<string, number> };
  const rows: string[][] = [["Section", "Metric", "Value"]];
  const append = (section: string, values: Record<string, number>) => Object.entries(values).forEach(([metric, value]) => rows.push([section, metric, String(value)]));
  append("Overview", report.overview); append("Selected period", report.period_activity); append("Verification", report.verification); append("Submissions", report.submissions); append("Security", report.security); append("Users by role", report.user_roles);
  const body = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="skillpass-report-${parsedFrom.toISOString().slice(0, 10)}-to-${parsedTo.toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
