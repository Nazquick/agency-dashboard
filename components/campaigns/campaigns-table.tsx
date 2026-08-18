"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import {
  CAMPAIGN_STATUSES,
  DISTRIBUTION_CHANNELS,
  campaignStatusBadgeClass,
  campaignStatusLabel,
  channelLabel,
} from "@/lib/campaigns/constants";
import { CampaignForm, type CampaignWithClient } from "@/components/campaigns/campaign-form";
import type { Tables } from "@/lib/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ALL = "__all__";

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function CampaignsTable({
  initialCampaigns,
  clients,
}: {
  initialCampaigns: CampaignWithClient[];
  clients: Pick<Tables<"clients">, "id" | "name" | "group_id">[];
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [channelFilter, setChannelFilter] = useState(ALL);

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      const { data } = await supabase
        .from("campaigns")
        .select("*, client:clients(id, name)")
        .order("created_at", { ascending: false });
      if (!data || cancelled) return;
      setCampaigns(data as unknown as CampaignWithClient[]);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;
      channel = supabase
        .channel("campaigns-table")
        .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) return false;
      if (clientFilter !== ALL && c.client_id !== clientFilter) return false;
      if (statusFilter !== ALL && c.status !== statusFilter) return false;
      if (channelFilter !== ALL && !c.distribution_channels.includes(channelFilter)) return false;
      return true;
    });
  }, [campaigns, search, clientFilter, statusFilter, channelFilter]);

  function upsertLocal(updated: Tables<"campaigns">) {
    setCampaigns((prev) => {
      const client = clients.find((c) => c.id === updated.client_id) ?? null;
      const next = { ...updated, client } as CampaignWithClient;
      const exists = prev.some((c) => c.id === updated.id);
      return exists ? prev.map((c) => (c.id === updated.id ? next : c)) : [next, ...prev];
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or code…"
            className="w-56"
          />
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {CAMPAIGN_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All channels</SelectItem>
              {DISTRIBUTION_CHANNELS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CampaignForm clients={clients} trigger={<Button>New Campaign</Button>} onSuccess={upsertLocal} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No campaigns match these filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Ad spend</TableHead>
                <TableHead>ROAS</TableHead>
                <TableHead>Publication</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <Link href={`/campaigns/${c.id}`} className="hover:underline">
                      {c.code}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/campaigns/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.client?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={campaignStatusBadgeClass(c.status)}>{campaignStatusLabel(c.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-[180px] flex-wrap gap-1">
                      {c.distribution_channels.map((v) => (
                        <Badge key={v} variant="secondary" className="text-xs">
                          {channelLabel(v)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatCurrency(c.budget)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatCurrency(c.ad_spend)}</TableCell>
                  <TableCell className="text-muted-foreground">{c.roas != null ? `${c.roas}x` : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.publication_date)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <CampaignForm
                        campaign={c}
                        clients={clients}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        }
                        onSuccess={upsertLocal}
                        onDelete={(id) => setCampaigns((prev) => prev.filter((camp) => camp.id !== id))}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
