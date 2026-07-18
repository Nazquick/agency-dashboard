"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ReportSections } from "@/lib/reports/client-report-document";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SECTION_OPTIONS: { key: keyof ReportSections; label: string; description: string }[] = [
  { key: "overview", label: "Client overview", description: "Description on file for this client" },
  { key: "rolesSummary", label: "Roles activated", description: "Which roles worked on this client, and how often" },
  { key: "taskList", label: "Work performed", description: "Full list of tasks, status, priority, and hours" },
  { key: "engagement", label: "Content engagement", description: "Views, likes, comments, shares per asset" },
  { key: "performance", label: "Performance highlights", description: "Top performers and assets needing attention" },
];

export function ExtractReportDialog({
  client,
  assets,
  socialAccounts,
}: {
  client: Tables<"clients">;
  assets: Tables<"content_assets">[];
  socialAccounts: Tables<"client_social_accounts">[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<ReportSections>({
    overview: true,
    taskList: true,
    rolesSummary: true,
    engagement: assets.length > 0,
    performance: assets.length > 0,
  });

  function toggle(key: keyof ReportSections) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleExtract() {
    setLoading(true);
    const res = await fetch("/api/reports/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, sections }),
    });

    if (!res.ok) {
      setLoading(false);
      toast.error("Failed to generate report");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client.name.replace(/[^a-z0-9]/gi, "-")}-report.pdf`;
    a.click();
    URL.revokeObjectURL(url);

    setLoading(false);
    setOpen(false);
    toast.success("Report downloaded");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Extract
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extract report — {client.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose what to include in the one-pager PDF for this client.
          </p>
          <div className="space-y-3">
            {SECTION_OPTIONS.map((opt) => (
              <div key={opt.key} className="flex items-start gap-3">
                <Checkbox
                  id={`section-${opt.key}`}
                  checked={sections[opt.key]}
                  onCheckedChange={() => toggle(opt.key)}
                />
                <div>
                  <Label htmlFor={`section-${opt.key}`} className="font-normal">
                    {opt.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </div>
            ))}
          </div>
          {socialAccounts.length === 0 && (
            <p className="text-xs text-amber-700">
              No social accounts logged for this client yet — engagement and performance sections
              will be empty.
            </p>
          )}
          <Button onClick={handleExtract} disabled={loading} className="w-full">
            {loading ? "Generating…" : "Extract PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
