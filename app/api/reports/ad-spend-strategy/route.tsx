import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { isMasterKeyUser } from "@/lib/auth/roles";
import { AdSpendStrategyDocument } from "@/lib/reports/ad-spend-strategy-document";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  if (!isMasterKeyUser(profile?.email)) {
    return NextResponse.json({ error: "Only the admin account can do this" }, { status: 403 });
  }

  const pdfBuffer = await renderToBuffer(
    <AdSpendStrategyDocument generatedAt={new Date().toLocaleDateString()} />
  );

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="DYOR-Ad-Spend-Strategy.pdf"`,
    },
  });
}
