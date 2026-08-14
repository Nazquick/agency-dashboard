import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserProvider } from "@/components/providers/user-provider";
import { SessionHeartbeat } from "@/components/providers/session-heartbeat";
import { ClientTopTabs } from "@/components/nav/client-top-tabs";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/");
  }

  if (profile.role !== "client") {
    redirect("/today");
  }

  return (
    <UserProvider profile={profile}>
      <div className="min-h-screen bg-muted/40">
        <SessionHeartbeat userId={profile.id} />
        <ClientTopTabs />
        <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
    </UserProvider>
  );
}
