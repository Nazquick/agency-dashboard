"use client";

import { useRouter } from "next/navigation";
import { ClientForm } from "@/components/clients/client-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewClientPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>New client</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            onSuccess={(client) => {
              router.refresh();
              router.push(`/clients/${client.id}/overview`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
