import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { isMasterKeyUser } from "@/lib/auth/roles";
import { AdSpendStrategyDocument } from "@/lib/reports/ad-spend-strategy-document";
import type { AdSpendLanguage, AdSpendVariant } from "@/lib/reports/ad-spend-strategy-content";

const LANGUAGES: AdSpendLanguage[] = ["en", "no"];
const VARIANTS: AdSpendVariant[] = ["simple", "advanced"];

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const languageParam = searchParams.get("language");
  const variantParam = searchParams.get("variant");

  const language: AdSpendLanguage = LANGUAGES.includes(languageParam as AdSpendLanguage)
    ? (languageParam as AdSpendLanguage)
    : "en";
  const variant: AdSpendVariant = VARIANTS.includes(variantParam as AdSpendVariant)
    ? (variantParam as AdSpendVariant)
    : "advanced";

  const pdfBuffer = await renderToBuffer(
    <AdSpendStrategyDocument
      generatedAt={new Date().toLocaleDateString()}
      language={language}
      variant={variant}
    />
  );

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="DYOR-Ad-Spend-Strategy-${language}-${variant}.pdf"`,
    },
  });
}
