import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VerificationQRCode from "@/components/verification/VerificationQRCode";
import { Brand } from "@/components/brand";

type VerificationPageProps = {
  params: Promise<{
    verificationId: string;
  }>;
};

export default async function VerificationPage({
  params,
}: VerificationPageProps) {
  const { verificationId } = await params;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_public_skill_verification",
    {
      verification_public_id: verificationId,
    },
  );

  if (error || !data || data.length === 0) {
    notFound();
  }

  const verification = data[0];

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <Brand />

            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Verified Skill
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              This record has been publicly verified through SkillPass Africa.
            </p>
          </div>

          <div className="mb-6 rounded-lg border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">
              Verification ID
            </p>

            <p className="mt-1 font-mono font-semibold">
              {verification.public_verification_id}
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">Learner</p>
              <p className="mt-1 font-semibold">
                {verification.learner_name}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Verified skill
              </p>

              <p className="mt-1 font-semibold">
                {verification.skill_name}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Project</p>

              <p className="mt-1 font-semibold">
                {verification.project_title}
              </p>
            </div>

            {verification.project_description && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Project description
                </p>

                <p className="mt-1 text-sm leading-6">
                  {verification.project_description}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">
                Competency rating
              </p>

              <p className="mt-1 font-semibold">
                {verification.competency_rating ?? "Not provided"} / 5
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Verification date
              </p>

              <p className="mt-1 font-semibold">
                {new Date(
                  verification.verified_at,
                ).toLocaleDateString()}
              </p>
            </div>

            <div className="border-t pt-5">
  {verification.verification_status === "active" && (
    <span className="inline-flex rounded-full border px-3 py-1 text-sm font-medium">
      ✓ Verified
    </span>
  )}

  {verification.verification_status === "revoked" && (
    <span className="inline-flex rounded-full border px-3 py-1 text-sm font-medium">
      ⚠ Verification revoked
    </span>
  )}

  {verification.verification_status === "suspended" && (
    <span className="inline-flex rounded-full border px-3 py-1 text-sm font-medium">
      ⚠ Verification suspended
    </span>
  )}
</div>

            <div className="border-t pt-6">
              <div className="flex flex-col items-center">
                <h2 className="text-lg font-semibold">
                  Scan to verify
                </h2>

                <p className="mt-1 mb-4 text-center text-sm text-muted-foreground">
                  Scan this QR code to open this public verification record.
                </p>

                <VerificationQRCode
                  verificationId={verification.public_verification_id}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
