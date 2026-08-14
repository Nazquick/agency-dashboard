import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardingForm } from "@/components/onboard/onboarding-form";

export default async function OnboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("whitelabel_invites")
    .select("id, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  const expired = !!invite?.expires_at && new Date(invite.expires_at) < new Date();
  const valid = !!invite && invite.status === "pending" && !expired;

  if (!valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">This link isn&apos;t valid</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {invite?.status === "used"
              ? "This invite has already been used to set up a dashboard."
              : "This invite is invalid, revoked, or has expired. Ask DYOR for a new link."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Set up your dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Powered by DYOR — a few steps to get your own branded copy of this dashboard live.
          </p>
        </div>
        <OnboardingForm token={token} />
      </div>
    </div>
  );
}
