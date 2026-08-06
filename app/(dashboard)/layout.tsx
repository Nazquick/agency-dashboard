import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserProvider, RolesProvider, GroupsProvider } from "@/components/providers/user-provider";
import { SessionHeartbeat } from "@/components/providers/session-heartbeat";
import { TopTabs } from "@/components/nav/top-tabs";
import { PushNotificationsManager } from "@/components/push/push-notifications-manager";

export default async function DashboardLayout({
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

  const [{ data: profile }, { data: roles }, { data: groups }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("roles").select("value, label").order("label"),
    supabase.from("client_groups").select("id, name").order("name"),
  ]);

  if (!profile) {
    redirect("/");
  }

  if (profile.role === "client") {
    redirect("/portal");
  }

  return (
    <UserProvider profile={profile}>
      <RolesProvider roles={roles ?? []}>
        <GroupsProvider groups={groups ?? []}>
          <div className="min-h-screen bg-muted/40">
            <SessionHeartbeat userId={profile.id} />
            <PushNotificationsManager />
            <TopTabs />
            <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
          </div>
        </GroupsProvider>
      </RolesProvider>
    </UserProvider>
  );
}
