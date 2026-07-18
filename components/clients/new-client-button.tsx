"use client";

import Link from "next/link";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";

export function NewClientButton() {
  const profile = useUser();

  if (!isTeamLeader(profile.role)) {
    return null;
  }

  return (
    <Button asChild>
      <Link href="/clients/new">New Client</Link>
    </Button>
  );
}
