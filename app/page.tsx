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
    .order("name");

  // JØNK's nine locations all read as one brand on the landing page — fold
  // them into a single folder using the first location's cover photo.
  const jonkLocations = (clients ?? []).filter((c) => c.name.trim().startsWith("JØNK"));
  const otherClients = (clients ?? []).filter((c) => !c.name.trim().startsWith("JØNK"));
  const groupedClients = [
    ...(jonkLocations.length > 0
      ? [{ id: jonkLocations[0].id, name: "JØNK", cover_image_path: jonkLocations[0].cover_image_path }]
      : []),
    ...otherClients,
  ];

  const projects: UpcomingProject[] = await Promise.all(
    groupedClients.map(async (client, i) => {
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
