"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import type { Tables } from "@/lib/types/database.types";
import { AddContactDialog } from "@/components/clients/add-contact-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ContactsSection({
  clientId,
  initialContacts,
}: {
  clientId: string;
  initialContacts: Tables<"client_contacts">[];
}) {
  const profile = useUser();
  const [contacts, setContacts] = useState(initialContacts);
  const canManage = isTeamLeader(profile.role);

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("client_contacts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setContacts((prev) => prev.filter((c) => c.id !== id));
    toast.success("Contact removed");
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">Key contacts</CardTitle>
        {canManage && (
          <AddContactDialog
            clientId={clientId}
            onAdded={(contact) => setContacts((prev) => [...prev, contact])}
          />
        )}
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{contact.name}</span>
                    {contact.is_primary && <Badge variant="secondary">Primary</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[contact.role, contact.email, contact.phone].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(contact.id)}
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
