import type { Tables } from "@/lib/types/database.types";
import type { PostWithRelations } from "@/components/social-posts/create-post-dialog";

type CreditProfile = Pick<Tables<"profiles">, "id" | "full_name">;

type RawPostRow = Tables<"social_posts"> & {
  social_post_credits: { profile: CreditProfile | null }[];
};

export function flattenPostCredits(rows: RawPostRow[]): PostWithRelations[] {
  return rows.map((row) => ({
    ...row,
    credits: row.social_post_credits
      .map((c) => c.profile)
      .filter((p): p is CreditProfile => p !== null),
  }));
}
