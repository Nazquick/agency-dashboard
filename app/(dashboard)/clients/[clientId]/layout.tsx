import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SideTabs } from "@/components/nav/side-tabs";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .single();

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
      <div className="flex gap-8">
        <SideTabs clientId={client.id} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
