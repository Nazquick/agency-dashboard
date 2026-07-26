import { LandingPage } from "@/components/marketing/landing-page";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_META, type UpcomingProject } from "@/lib/marketing/upcoming-projects";

// Cover images use 1-hour signed URLs — revalidate well under that so a
// prerendered page never serves a link past its expiry.
export const revalidate = 1800;

export default async function Home() {
  const admin = createAdminClient();
  const { data: clients } = await admin
    .from("clients")
    .select("id, name, cover_image_path")
    .eq("archived", false)
    .order("name")
    .limit(PROJECT_META.length);

  const projects: UpcomingProject[] = await Promise.all(
    (clients ?? []).map(async (client, i) => {
      const meta = PROJECT_META[i % PROJECT_META.length];
      let coverUrl: string | null = null;
      if (client.cover_image_path) {
        const { data } = await admin.storage
          .from("client-assets")
          .createSignedUrl(client.cover_image_path, 60 * 60);
        coverUrl = data?.signedUrl ?? null;
      }
      return { id: client.id, client: client.name.trim(), coverUrl, ...meta };
    })
  );

  return <LandingPage projects={projects} />;
}
