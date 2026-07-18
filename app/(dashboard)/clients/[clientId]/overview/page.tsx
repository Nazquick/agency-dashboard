import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditClientDialog } from "@/components/clients/edit-client-dialog";
import { ContactsSection } from "@/components/clients/contacts-section";
import { ClientCoverUploader } from "@/components/clients/client-cover-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: contacts }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase
      .from("client_contacts")
      .select("*")
      .eq("client_id", clientId)
      .order("is_primary", { ascending: false }),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Description</CardTitle>
          <div className="flex gap-2">
            <ClientCoverUploader clientId={client.id} hasCover={Boolean(client.cover_image_path)} />
            <EditClientDialog client={client} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {client.description || "No description yet."}
          </p>
        </CardContent>
      </Card>

      <ContactsSection clientId={client.id} initialContacts={contacts ?? []} />
    </div>
  );
}
