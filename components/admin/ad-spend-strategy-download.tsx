"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AdSpendStrategyDownload() {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    const res = await fetch("/api/reports/ad-spend-strategy");

    if (!res.ok) {
      setLoading(false);
      toast.error("Failed to generate PDF");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "DYOR-Ad-Spend-Strategy.pdf";
    a.click();
    URL.revokeObjectURL(url);

    setLoading(false);
    toast.success("Ad spend strategy downloaded");
  }

  return (
    <Button variant="outline" onClick={handleDownload} disabled={loading} className="w-full">
      {loading ? "Generating…" : "Download PDF"}
    </Button>
  );
}
