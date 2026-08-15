import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostPlanCalendar } from "@/components/social-posts/post-plan-calendar";
import { flattenPostCredits } from "@/lib/social-posts/flatten";

export default async function PortalPostPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, client_group_id")
    .eq("id", user.id)
    .single();
  if (!profile?.client_id && !profile?.client_group_id) redirect("/");

  // No explicit client filter — RLS (social_posts_select) already scopes
  // this to only the posts tagged to whatever this account can access.
  const { data: posts } = await supabase
    .from("social_posts")
    .select("*, client:clients(id, name), social_post_credits(profile:profiles(id, full_name))")
    .order("post_at");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Post Plan</h1>
        <p className="text-sm text-muted-foreground">
          What&apos;s scheduled for your social channels.
        </p>
      </div>

      <PostPlanCalendar
        initialPosts={flattenPostCredits(
          (posts ?? []) as unknown as Parameters<typeof flattenPostCredits>[0]
        )}
        readOnly
      />
    </div>
  );
}
