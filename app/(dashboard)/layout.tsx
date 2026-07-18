import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserProvider } from "@/components/providers/user-provider";
import { TopTabs } from "@/components/nav/top-tabs";

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
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return (
    <UserProvider profile={profile}>
      <div className="min-h-screen bg-gray-50">
        <TopTabs />
        <main className="mx-auto max-w-7xl p-6">{children}</main>
      </div>
    </UserProvider>
  );
}
