"use client";

import { useState, type MouseEvent } from "react";
import { Plus, X, Video, Image as ImageIcon, PenTool, Users } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database.types";

type ProofType = Database["public"]["Enums"]["content_proof_type"];

const OPTIONS: { type: ProofType; label: string; icon: typeof Video; angle: number }[] = [
  { type: "video", label: "Video", icon: Video, angle: 180 },
  { type: "image", label: "Image", icon: ImageIcon, angle: 150 },
  { type: "graphic", label: "Graphic", icon: PenTool, angle: 120 },
  { type: "collab", label: "Collab post", icon: Users, angle: 90 },
];

const RADIUS = 64;

export function ReportPostButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const profile = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<ProofType | null>(null);
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function stop(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function pick(type: ProofType, e: MouseEvent) {
    stop(e);
    setMenuOpen(false);
    setSelected(type);
    setLink("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = link.trim();
    if (!trimmed || !selected) return;

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("content_proofs").insert({
      client_id: clientId,
      type: selected,
      link: trimmed,
      reported_by: profile.id,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Post reported");
    setSelected(null);
    setLink("");
  }

  const selectedOption = OPTIONS.find((o) => o.type === selected);

  return (
    <>
      <div className="absolute bottom-3 right-3 z-20">
        {menuOpen && (
          <div
            role="presentation"
            className="fixed inset-0 z-10 cursor-default"
            onClick={(e) => {
              stop(e);
              setMenuOpen(false);
            }}
          />
        )}
        {OPTIONS.map((opt) => {
          const rad = (opt.angle * Math.PI) / 180;
          const x = Math.cos(rad) * RADIUS;
          const y = -Math.sin(rad) * RADIUS;
          const Icon = opt.icon;
          return (
            <button
              key={opt.type}
              type="button"
              aria-label={`Report a ${opt.label.toLowerCase()}`}
              onClick={(e) => pick(opt.type, e)}
              className={cn(
                "absolute right-0 bottom-0 z-20 flex size-10 items-center justify-center rounded-full border bg-card text-foreground shadow-md transition-all duration-200 ease-out",
                menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              )}
              style={{
                transform: menuOpen ? `translate(${x}px, ${y}px)` : "translate(0, 0)",
              }}
              title={opt.label}
            >
              <Icon className="size-4" />
            </button>
          );
        })}
        <Button
          type="button"
          size="icon"
          className="relative z-20 size-10 rounded-full shadow-md"
          aria-label={menuOpen ? "Close report menu" : "Report a posted item"}
          onClick={(e) => {
            stop(e);
            setMenuOpen((v) => !v);
          }}
        >
          {menuOpen ? <X className="size-4" /> : <Plus className="size-4" />}
        </Button>
      </div>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>
              Report {selectedOption?.label.toLowerCase()} — {clientName}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proof-link">Link to the post</Label>
              <Input
                id="proof-link"
                type="url"
                placeholder="https://..."
                required
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A link is required as proof before this can be reported.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={submitting || !link.trim()}>
              {submitting ? "Reporting…" : "Report post"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
