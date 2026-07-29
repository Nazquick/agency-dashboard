"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AD_SPEND_LANGUAGES,
  AD_SPEND_VARIANTS,
  type AdSpendLanguage,
  type AdSpendVariant,
} from "@/lib/reports/ad-spend-strategy-content";
import { Button } from "@/components/ui/button";
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

export function AdSpendStrategyDownload() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<AdSpendLanguage>("en");
  const [variant, setVariant] = useState<AdSpendVariant>("simple");

  async function handleDownload() {
    setLoading(true);
    const res = await fetch(
      `/api/reports/ad-spend-strategy?language=${language}&variant=${variant}`
    );

    if (!res.ok) {
      setLoading(false);
      toast.error("Failed to generate PDF");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DYOR-Ad-Spend-Strategy-${language}-${variant}.pdf`;
    a.click();
    URL.revokeObjectURL(url);

    setLoading(false);
    setOpen(false);
    toast.success("Ad spend strategy downloaded");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          Choose & download
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ad spend strategy — one-pager</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ad-spend-language">Language</Label>
            <Select value={language} onValueChange={(value) => setLanguage(value as AdSpendLanguage)}>
              <SelectTrigger id="ad-spend-language" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AD_SPEND_LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ad-spend-variant">Version</Label>
            <Select value={variant} onValueChange={(value) => setVariant(value as AdSpendVariant)}>
              <SelectTrigger id="ad-spend-variant" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AD_SPEND_VARIANTS.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {AD_SPEND_VARIANTS.find((v) => v.value === variant)?.description}
            </p>
          </div>
          <Button onClick={handleDownload} disabled={loading} className="w-full">
            {loading ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
