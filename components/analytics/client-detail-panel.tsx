"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import { classifyPerformance } from "@/lib/analytics/metrics";
import { salesThisMonth, formatSales } from "@/lib/analytics/sales";
import { platformLabel, assetTypeLabel, type ContentAssetType } from "@/lib/analytics/constants";
import { SocialAccountForm } from "@/components/analytics/social-account-form";
import { ContentAssetForm } from "@/components/analytics/content-asset-form";
import { PerformanceBadge } from "@/components/analytics/performance-badge";
import { ExtractReportDialog } from "@/components/analytics/extract-report-dialog";
import { SalesForm } from "@/components/analytics/sales-form";
import { SalesChart, type PostMarker } from "@/components/analytics/sales-chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Tables } from "@/lib/types/database.types";

export function ClientDetailPanel({
  client,
  socialAccounts,
  assets,
  sales,
  contentProofs,
  onSocialAccountAdded,
  onAssetSaved,
  onAssetDeleted,
  onSaleAdded,
}: {
  client: Tables<"clients">;
  socialAccounts: Tables<"client_social_accounts">[];
  assets: Tables<"content_assets">[];
  sales: Tables<"client_sales">[];
  contentProofs: Tables<"content_proofs">[];
  onSocialAccountAdded: (account: Tables<"client_social_accounts">) => void;
  onAssetSaved: (asset: Tables<"content_assets">) => void;
  onAssetDeleted: (assetId: string) => void;
  onSaleAdded: (sale: Tables<"client_sales">) => void;
}) {
  const profile = useUser();
  const leader = isTeamLeader(profile.role);
  const tiers = useMemo(() => classifyPerformance(assets), [assets]);

  const salesPoints = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const s of sales) {
      byDate.set(s.sale_date, (byDate.get(s.sale_date) ?? 0) + Number(s.amount));
    }
    return [...byDate.entries()].map(([date, amount]) => ({ date, amount }));
  }, [sales]);

  const postMarkers: PostMarker[] = useMemo(() => {
    const fromAssets = assets.map((a) => ({
      date: (a.published_at ?? a.created_at).slice(0, 10),
      label: `${assetTypeLabel(a.asset_type as ContentAssetType)}: ${a.title}`,
    }));
    const fromProofs = contentProofs.map((p) => ({
      date: p.created_at.slice(0, 10),
      label: `${p.type[0].toUpperCase()}${p.type.slice(1)} reported`,
    }));
    return [...fromAssets, ...fromProofs];
  }, [assets, contentProofs]);

  async function handleDelete(assetId: string) {
    if (!window.confirm("Delete this logged asset?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("content_assets").delete().eq("id", assetId);
    if (error) {
      toast.error(error.message);
      return;
    }
    onAssetDeleted(assetId);
    toast.success("Asset removed");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Sales</CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatSales(salesThisMonth(sales, client.id))} this month
            </p>
          </div>
          <SalesForm
            clientId={client.id}
            trigger={<Button size="sm">Log sale</Button>}
            onSuccess={onSaleAdded}
          />
        </CardHeader>
        <CardContent>
          <SalesChart sales={salesPoints} postMarkers={postMarkers} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Social accounts</CardTitle>
          <SocialAccountForm clientId={client.id} onSuccess={onSocialAccountAdded} />
        </CardHeader>
        <CardContent>
          {socialAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No social accounts added yet{leader ? "" : " — ask a team leader to add one"}.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {socialAccounts.map((a) => (
                <li key={a.id}>
                  <Badge variant="secondary">
                    {platformLabel(a.platform)} — {a.handle}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Content performance</CardTitle>
          <div className="flex flex-wrap gap-2">
            <ContentAssetForm
              clientId={client.id}
              socialAccounts={socialAccounts}
              trigger={<Button size="sm">Log asset</Button>}
              onSuccess={onAssetSaved}
            />
            <ExtractReportDialog client={client} assets={assets} socialAccounts={socialAccounts} />
          </div>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No assets logged yet. Add a social account, then log posts to track performance.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Likes</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {assetTypeLabel(asset.asset_type as ContentAssetType)}
                      </TableCell>
                      <TableCell>{asset.views.toLocaleString()}</TableCell>
                      <TableCell>{asset.likes.toLocaleString()}</TableCell>
                      <TableCell>{asset.comments.toLocaleString()}</TableCell>
                      <TableCell>{asset.shares.toLocaleString()}</TableCell>
                      <TableCell>
                        <PerformanceBadge tier={tiers.get(asset.id) ?? "normal"} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <ContentAssetForm
                            clientId={client.id}
                            socialAccounts={socialAccounts}
                            asset={asset}
                            trigger={
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            }
                            onSuccess={onAssetSaved}
                          />
                          {leader && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(asset.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
