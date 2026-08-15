import { createClient } from "@/lib/supabase/server";
import { PostPlanCalendar } from "@/components/social-posts/post-plan-calendar";
import { flattenPostCredits } from "@/lib/social-posts/flatten";

export default async function PostPlanPage() {
  const supabase = await createClient();

  const [{ data: posts }, { data: profiles }, { data: clients }] = await Promise.all([
    supabase
      .from("social_posts")
      .select("*, client:clients(id, name), social_post_credits(profile:profiles(id, full_name))")
      .order("post_at"),
    supabase
      .from("profiles")
      .select("id, full_name, role, is_external")
      .neq("role", "client")
      .eq("active", true)
      .order("full_name"),
    supabase.from("clients").select("id, name, group_id").eq("archived", false).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Post Plan</h1>
        <p className="text-sm text-muted-foreground">
          The team&apos;s social media publishing calendar — click + on any date to schedule a post.
        </p>
      </div>

      <PostPlanCalendar
        initialPosts={flattenPostCredits(
          (posts ?? []) as unknown as Parameters<typeof flattenPostCredits>[0]
        )}
        profiles={profiles ?? []}
        clients={clients ?? []}
      />
    </div>
  );
}
