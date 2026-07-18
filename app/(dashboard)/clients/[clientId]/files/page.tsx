import { createClient } from "@/lib/supabase/server";
import { ClientFileUploader } from "@/components/clients/client-file-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FILE_TYPE_LABELS: Record<string, string> = {
  graphic_pack: "Graphic pack",
  onboarding: "Onboarding file",
  brand_guide: "Brand guide book",
  other: "Other",
};

export default async function ClientFilesPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const { data: files } = await supabase
    .from("client_files")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  const filesWithUrls = await Promise.all(
    (files ?? []).map(async (file) => {
      const { data } = await supabase.storage
        .from("client-assets")
        .createSignedUrl(file.storage_path, 60 * 60);
      return { ...file, url: data?.signedUrl ?? null };
    })
  );

  const grouped = filesWithUrls.reduce<Record<string, typeof filesWithUrls>>((acc, file) => {
    (acc[file.file_type] ??= []).push(file);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <ClientFileUploader clientId={clientId} />

      {Object.keys(FILE_TYPE_LABELS).map((type) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="text-base">{FILE_TYPE_LABELS[type]}</CardTitle>
          </CardHeader>
          <CardContent>
            {grouped[type]?.length ? (
              <ul className="space-y-2">
                {grouped[type].map((file) => (
                  <li key={file.id} className="text-sm">
                    {file.url ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-4"
                      >
                        {file.file_name}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{file.file_name}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
