import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { isMasterKeyUser } from "@/lib/auth/roles";
import { channelLabel } from "@/lib/campaigns/constants";
import { CampaignExportDocument } from "@/lib/campaigns/campaign-export-document";

export async function GET(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single();
  if (!isMasterKeyUser(profile?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: campaign }, { data: attachments }] = await Promise.all([
    supabase.from("campaigns").select("*, client:clients(id, name)").eq("id", campaignId).maybeSingle(),
    supabase
      .from("campaign_attachments")
      .select("storage_path, file_name, mime_type")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false }),
  ]);

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const imageAttachments = (attachments ?? []).filter((a) => (a.mime_type ?? "").startsWith("image/"));
  const images = (
    await Promise.all(
      imageAttachments.map(async (a) => {
        const { data: signed } = await supabase.storage
          .from("campaign-attachments")
          .createSignedUrl(a.storage_path, 300);
        return signed ? { url: signed.signedUrl, fileName: a.file_name } : null;
      })
    )
  ).filter((img): img is { url: string; fileName: string } => img !== null);

  const pdfBuffer = await renderToBuffer(
    <CampaignExportDocument
      data={{
        code: campaign.code,
        name: campaign.name,
        clientName: campaign.client?.name ?? "—",
        channels: campaign.distribution_channels.map(channelLabel),
        publicationDate: campaign.publication_date,
        generatedAt: new Date().toISOString(),
        images,
      }}
    />
  );

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${campaign.code}-${campaign.name.replace(/[^a-z0-9]/gi, "-")}-summary.pdf"`,
    },
  });
}
