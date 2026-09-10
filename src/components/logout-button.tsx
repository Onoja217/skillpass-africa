"use client";

import { useFormStatus } from "react-dom";
import { logout } from "@/app/auth/actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="button" disabled={pending} type="submit">{pending ? "Signing out…" : "Sign out"}</button>;
}

export function LogoutButton() { return <form action={logout}><Submit /></form>; }
