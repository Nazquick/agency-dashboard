"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import { ClientForm } from "@/components/clients/client-form";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function EditClientDialog({ client }: { client: Tables<"clients"> }) {
  const profile = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!isTeamLeader(profile.role)) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit client</DialogTitle>
        </DialogHeader>
        <ClientForm
          client={client}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
