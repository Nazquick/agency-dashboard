"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";

export function ClientCoverUploader({
  clientId,
  hasCover,
}: {
  clientId: string;
  hasCover: boolean;
}) {
  const profile = useUser();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!isTeamLeader(profile.role)) {
    return null;
  }

  async function handlePick() {
    inputRef.current?.click();
  }

  async function handleChange() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createClient();
    const storagePath = `${clientId}/cover/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("client-assets")
      .upload(storagePath, file);

    if (uploadError) {
      setUploading(false);
      toast.error(uploadError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("clients")
      .update({ cover_image_path: storagePath })
      .eq("id", clientId);

    setUploading(false);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    toast.success("Cover image updated");
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <Button variant="outline" size="sm" onClick={handlePick} disabled={uploading}>
        {uploading ? "Uploading…" : hasCover ? "Replace cover image" : "Add cover image"}
      </Button>
    </div>
  );
}
