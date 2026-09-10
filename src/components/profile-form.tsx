"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfile } from "@/app/profile/actions";
import type { Profile } from "@/types/database";

function SaveButton() { const { pending } = useFormStatus(); return <button className="button" disabled={pending} type="submit">{pending ? "Saving…" : "Save profile"}</button>; }
export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfile, {});
  return <form action={action} className="card" style={{ padding: "clamp(1.2rem,4vw,2rem)", display: "grid", gap: 18 }}>
    {state.error ? <p className="notice error" role="alert">{state.error}</p> : null}{state.success ? <p className="notice success" role="status">{state.success}</p> : null}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}><div className="field"><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" defaultValue={profile.full_name} required /></div><div className="field"><label htmlFor="email">Email address</label><input id="email" value={profile.email} disabled aria-describedby="email-note" /><small id="email-note">Managed through your sign-in account.</small></div><div className="field"><label htmlFor="phone">Phone number</label><input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" /></div><div className="field"><label htmlFor="location">Location</label><input id="location" name="location" defaultValue={profile.location ?? ""} autoComplete="address-level2" /></div></div>
    <div className="field"><label htmlFor="biography">Biography</label><textarea id="biography" name="biography" rows={5} maxLength={600} defaultValue={profile.biography ?? ""} /></div>
    <div className="field"><label htmlFor="selected_skills">Selected skills</label><input id="selected_skills" name="selected_skills" defaultValue={profile.selected_skills.join(", ")} placeholder="Product design, React, Data analysis" /><small>Separate up to 20 skills with commas.</small></div>
    <div className="field"><label htmlFor="avatar">Profile photograph</label><input id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" /></div>
    <div className="field"><label htmlFor="role">Account role</label><input id="role" value={profile.role} disabled /></div><div><SaveButton /></div>
  </form>;
}
