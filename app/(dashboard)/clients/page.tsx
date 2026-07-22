import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewClientButton } from "@/components/clients/new-client-button";
import { ReportPostButton } from "@/components/clients/report-post-button";
import { colorAtIndex } from "@/lib/colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ClientsPage() {
  const supabase = await createClient();
  const [{ data: clients }, { data: openTasks }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, description, archived, cover_image_path")
      .eq("archived", false)
      .order("name"),
    supabase.from("tasks").select("client_id").neq("status", "done").eq("archived", false),
  ]);

  const outstandingByClient = new Map<string, number>();
  for (const task of openTasks ?? []) {
    if (!task.client_id) continue;
    outstandingByClient.set(task.client_id, (outstandingByClient.get(task.client_id) ?? 0) + 1);
  }

  const clientsWithCovers = await Promise.all(
    (clients ?? []).map(async (client) => {
      if (!client.cover_image_path) return { ...client, coverUrl: null };
      const { data } = await supabase.storage
        .from("client-assets")
        .createSignedUrl(client.cover_image_path, 60 * 60);
      return { ...client, coverUrl: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Brand assets, contacts, and per-client workflow.
          </p>
        </div>
        <NewClientButton />
      </div>

      {clientsWithCovers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientsWithCovers.map((client, index) => {
            const outstanding = outstandingByClient.get(client.id) ?? 0;
            return (
              <Card
                key={client.id}
                className="relative h-full overflow-hidden transition-colors hover:border-primary/40"
              >
                {client.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={client.coverUrl}
                    alt=""
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15"
                    aria-hidden
                  />
                )}
                <Link
                  href={`/clients/${client.id}/overview`}
                  className="absolute inset-0 z-0"
                  aria-label={client.name}
                />
                {outstanding > 0 && (
                  <span
                    className="absolute right-3 top-3 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white shadow-sm"
                    title={`${outstanding} task${outstanding === 1 ? "" : "s"} outstanding`}
                  >
                    {outstanding}
                  </span>
                )}
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: colorAtIndex(index) }}
                      aria-hidden
                    />
                    {client.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative pb-14">
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {client.description || "No description yet."}
                  </p>
                </CardContent>
                <ReportPostButton clientId={client.id} clientName={client.name} />
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No clients yet. {`"New Client"`} to add your first one.
          </p>
        </div>
      )}
    </div>
  );
}
