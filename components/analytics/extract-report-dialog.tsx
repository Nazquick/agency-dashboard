"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ReportSections } from "@/lib/reports/client-report-document";
import { REPORT_LANGUAGES, type ReportLanguage } from "@/lib/reports/i18n";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SECTION_OPTIONS: { key: keyof ReportSections; label: string; description: string }[] = [
  { key: "overview", label: "Client overview", description: "Description on file for this client" },
  { key: "rolesSummary", label: "Roles activated", description: "Which roles worked on this client, and how often — plus the top contributor" },
  { key: "taskList", label: "Work performed", description: "Full list of tasks, status, priority, and hours" },
  { key: "engagement", label: "Content engagement", description: "Views, likes, comments, shares per asset" },
  { key: "performance", label: "Performance highlights", description: "Best and weakest performing assets" },
  { key: "salesCampaign", label: "Sales & campaign performance", description: "Sales growth, ROAS, ad spend, app downloads, units + value sold" },
  { key: "advice", label: "Advice for a better month", description: "3 AI-generated suggestions based on this period's numbers" },
];

export function ExtractReportDialog({
  client,
  assets,
  socialAccounts,
  reports,
  sales,
}: {
  client: Tables<"clients">;
  assets: Tables<"content_assets">[];
  socialAccounts: Tables<"client_social_accounts">[];
  reports: Tables<"client_reports">[];
  sales: Tables<"client_sales">[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<ReportLanguage | undefined>(undefined);
  const [sections, setSections] = useState<ReportSections>({
    overview: true,
    taskList: true,
    rolesSummary: true,
    engagement: assets.length > 0,
    performance: assets.length > 0,
    salesCampaign: reports.length > 0 || sales.length > 0,
    advice: true,
  });

  function toggle(key: keyof ReportSections) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Reset so the dialog always asks for a language again, rather than
      // silently reusing whatever was picked last time.
      setLanguage(undefined);
    }
  }

  async function handleExtract() {
    if (!language) return;
    setLoading(true);
    const res = await fetch("/api/reports/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, sections, language }),
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <div className="space-y-2">
            <Label htmlFor="report-language">Report language</Label>
            <Select
              value={language}
              onValueChange={(value) => setLanguage(value as ReportLanguage)}
            >
              <SelectTrigger id="report-language" className="w-full">
                <SelectValue placeholder="Choose a language…" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          {reports.length === 0 && sales.length === 0 && (
            <p className="text-xs text-amber-700">
              No full reports or sales logged for this client yet — the sales & campaign section
              will be empty.
            </p>
          )}
          <Button onClick={handleExtract} disabled={loading || !language} className="w-full">
            {loading ? "Generating…" : "Extract PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
