"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AuthState } from "@/app/auth/actions";
import { roleDetails } from "@/lib/roles";

type Props = { mode: "login" | "register" | "forgot" | "reset"; action: (state: AuthState, formData: FormData) => Promise<AuthState> };
function Submit({ label }: { label: string }) { const { pending } = useFormStatus(); return <button className="button" disabled={pending} type="submit" style={{ width: "100%" }}>{pending ? "Please wait…" : label}</button>; }

export function AuthForm({ mode, action }: Props) {
  const [state, formAction] = useActionState(action, {});
  const titles = { login: "Welcome back", register: "Create your SkillPass", forgot: "Reset your password", reset: "Choose a new password" };
  const labels = { login: "Sign in", register: "Create account", forgot: "Send reset link", reset: "Update password" };
  return <form action={formAction} className="card" style={{ width: "min(100%, 470px)", padding: "clamp(1.3rem,5vw,2.4rem)", display: "grid", gap: 18 }}>
    <div><p className="eyebrow">SkillPass Africa</p><h1 style={{ margin: "8px 0 5px", fontSize: 32 }}>{titles[mode]}</h1></div>
    {state.error ? <p className="notice error" role="alert">{state.error}</p> : null}{state.success ? <p className="notice success" role="status">{state.success}</p> : null}
    {mode === "register" ? <div className="field"><label htmlFor="fullName">Full name</label><input id="fullName" name="fullName" autoComplete="name" required /></div> : null}
    {mode !== "reset" ? <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required /></div> : null}
    {mode !== "forgot" ? <div className="field"><label htmlFor="password">{mode === "reset" ? "New password" : "Password"}</label><input id="password" name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></div> : null}
    {mode === "register" ? <div className="field"><label htmlFor="role">Account type</label><select id="role" name="role" defaultValue="learner">{Object.entries(roleDetails).map(([value, detail]) => <option key={value} value={value}>{detail.label}</option>)}</select></div> : null}
    <Submit label={labels[mode]} />
    {mode === "login" ? <><Link href="/forgot-password" style={{ textAlign: "center", color: "var(--green)", fontWeight: 700 }}>Forgot password?</Link><p style={{ textAlign: "center" }}>New here? <Link href="/register" style={{ color: "var(--green)", fontWeight: 700 }}>Create an account</Link></p></> : null}
    {mode === "register" || mode === "forgot" ? <Link href="/login" style={{ textAlign: "center", color: "var(--green)", fontWeight: 700 }}>Back to sign in</Link> : null}
    {mode === "reset" && state.success ? <Link className="button secondary" href="/dashboard">Continue</Link> : null}
  </form>;
}
