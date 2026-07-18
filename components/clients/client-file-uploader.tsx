"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FILE_TYPES = [
  { value: "graphic_pack", label: "Graphic pack" },
  { value: "onboarding", label: "Onboarding file" },
  { value: "brand_guide", label: "Brand guide book" },
  { value: "other", label: "Other" },
] as const;

export function ClientFileUploader({ clientId }: { clientId: string }) {
  const profile = useUser();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileType, setFileType] = useState<(typeof FILE_TYPES)[number]["value"]>("graphic_pack");
  const [uploading, setUploading] = useState(false);

  if (!isTeamLeader(profile.role)) {
    return null;
  }

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file first");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const storagePath = `${clientId}/${fileType}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("client-assets")
      .upload(storagePath, file);

    if (uploadError) {
      setUploading(false);
      toast.error(uploadError.message);
      return;
    }

    const { error: insertError } = await supabase.from("client_files").insert({
      client_id: clientId,
      file_type: fileType,
      storage_path: storagePath,
      file_name: file.name,
    });

    setUploading(false);

    if (insertError) {
      toast.error(insertError.message);
      return;
    }

    toast.success("File uploaded");
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="space-y-2">
        <Label>File type</Label>
        <Select value={fileType} onValueChange={(v) => setFileType(v as typeof fileType)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="file-upload">File</Label>
        <input
          id="file-upload"
          ref={inputRef}
          type="file"
          className="block text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
        />
      </div>
      <Button onClick={handleUpload} disabled={uploading}>
        {uploading ? "Uploading…" : "Upload"}
      </Button>
    </div>
  );
}
