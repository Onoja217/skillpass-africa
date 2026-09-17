import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { Brand } from "@/components/brand";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <header style={{ borderBottom: "1px solid rgba(16,35,29,.1)", background: "rgba(247,243,232,.9)" }}>
      <div className="shell" style={{ minHeight: 70, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <Brand />
        <nav aria-label="Primary navigation" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? <><Link className="button secondary" href="/dashboard">Dashboard</Link><LogoutButton /></> : <><Link className="desktop-only" href="/login" style={{ padding: 12, fontWeight: 700 }}>Sign in</Link><Link className="button" href="/register">Create passport</Link></>}
        </nav>
      </div>
    </header>
  );
}
