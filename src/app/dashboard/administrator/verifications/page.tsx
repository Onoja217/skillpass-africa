import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import VerificationStatusForm from "./VerificationStatusForm";

export default async function AdministratorVerificationsPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "administrator") redirect(`/dashboard/${profile.role}`);

  const supabase = await createClient();
  const { data: verifications, error } = await supabase
    .from("skill_verifications")
    .select("id, learner_id, mentor_id, decision, competency_rating, verified_at, public_verification_id, verification_status")
    .order("verified_at", { ascending: false });

  if (error) throw new Error("Unable to load verifications.");

  return (
    <main>
      <section>
        <p className="eyebrow">Administrator</p>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-.045em", margin: "10px 0" }}>Verification controls</h1>
        <p style={{ color: "var(--muted)", fontSize: 17 }}>Monitor verified skills and suspend or revoke public verification records when necessary.</p>
      </section>
      <section style={{ display: "grid", gap: 16, marginTop: 32 }}>
        {verifications?.length ? verifications.map((verification) => (
          <article key={verification.id} className="card" style={{ padding: 24 }}>
            <p><strong>Verification ID:</strong> {verification.public_verification_id ?? "Pending"}</p>
            <p><strong>Decision:</strong> {verification.decision}</p>
            <p><strong>Rating:</strong> {verification.competency_rating ?? "Not provided"} / 5</p>
            <p><strong>Status:</strong> {verification.verification_status}</p>
            <VerificationStatusForm verificationId={verification.id} currentStatus={verification.verification_status} />
          </article>
        )) : <div className="card" style={{ padding: 24 }}>No verification records yet.</div>}
      </section>
    </main>
  );
}
