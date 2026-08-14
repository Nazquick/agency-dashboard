import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MyDayBoard, type MyDayTask } from "@/components/today/my-day-board";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/");
  if (profile.role === "client") redirect("/portal");

  const [{ data: assigneeRows }, { data: clients }, { data: profiles }] = await Promise.all([
    supabase
      .from("task_assignees")
      .select("tasks!inner(*, client:clients!tasks_client_id_fkey(id, name))")
      .eq("profile_id", profile.id)
      .eq("tasks.archived", false)
      .neq("tasks.status", "done"),
    supabase.from("clients").select("id, name").eq("archived", false).order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, role, is_external")
      .neq("role", "client")
      .eq("active", true)
      .order("full_name"),
  ]);

  const tasks = ((assigneeRows ?? []) as unknown as { tasks: MyDayTask }[]).map((row) => row.tasks);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s on your plate.</p>
      </div>
      <MyDayBoard initialTasks={tasks} clients={clients ?? []} profiles={profiles ?? []} />
    </div>
  );
}
