"use client";

import { useState } from "react";
import { ClientCompareGrid } from "@/components/analytics/client-compare-grid";
import { ClientDetailPanel } from "@/components/analytics/client-detail-panel";
import type { Tables } from "@/lib/types/database.types";

export function AnalyticsDashboard({
  clients,
  tasks,
  events,
  initialSocialAccounts,
  initialAssets,
  initialSales,
  initialContentProofs,
}: {
  clients: Tables<"clients">[];
  tasks: Pick<Tables<"tasks">, "client_id" | "created_at">[];
  events: Pick<Tables<"calendar_events">, "client_id" | "created_at">[];
  initialSocialAccounts: Tables<"client_social_accounts">[];
  initialAssets: Tables<"content_assets">[];
  initialSales: Tables<"client_sales">[];
  initialContentProofs: Tables<"content_proofs">[];
}) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    clients[0]?.id ?? null
  );
  const [socialAccounts, setSocialAccounts] = useState(initialSocialAccounts);
  const [assets, setAssets] = useState(initialAssets);
  const [sales, setSales] = useState(initialSales);

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;
  const clientSocialAccounts = socialAccounts.filter((a) => a.client_id === selectedClientId);
  const clientAssets = assets.filter((a) => a.client_id === selectedClientId);
  const clientSales = sales.filter((s) => s.client_id === selectedClientId);
  const clientContentProofs = initialContentProofs.filter(
    (p) => p.client_id === selectedClientId
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics & Data</h1>
        <p className="text-sm text-muted-foreground">
          Content performance, plan usage, and attention across every client.
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">Add a client first to see analytics.</p>
        </div>
      ) : (
        <>
          <ClientCompareGrid
            clients={clients}
            tasks={tasks}
            events={events}
            assets={assets}
            sales={sales}
            selectedClientId={selectedClientId}
            onSelect={setSelectedClientId}
          />

          {selectedClient && (
            <ClientDetailPanel
              client={selectedClient}
              socialAccounts={clientSocialAccounts}
              assets={clientAssets}
              sales={clientSales}
              contentProofs={clientContentProofs}
              onSocialAccountAdded={(account) =>
                setSocialAccounts((prev) => [...prev, account])
              }
              onAssetSaved={(asset) =>
                setAssets((prev) => {
                  const exists = prev.some((a) => a.id === asset.id);
                  return exists ? prev.map((a) => (a.id === asset.id ? asset : a)) : [...prev, asset];
                })
              }
              onAssetDeleted={(assetId) =>
                setAssets((prev) => prev.filter((a) => a.id !== assetId))
              }
              onSaleAdded={(sale) => setSales((prev) => [...prev, sale])}
            />
          )}
        </>
      )}
    </div>
  );
}
