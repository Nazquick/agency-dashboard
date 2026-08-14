import { DyorWordmark } from "@/components/branding/dyor-wordmark";
import { BRAND_LOGO_URL, BRAND_NAME } from "@/lib/branding/config";
import { cn } from "@/lib/utils";

const SIZES = { md: "h-4", lg: "h-5", xl: "h-7" } as const;

// Falls back to the hardcoded DyorWordmark whenever no tenant logo is
// configured — i.e. always, on DYOR's own deployment.
export function BrandLogo({
  size = "lg",
  animated = false,
  className,
}: {
  size?: keyof typeof SIZES;
  animated?: boolean;
  className?: string;
}) {
  if (!BRAND_LOGO_URL) {
    return <DyorWordmark size={size} animated={animated} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_URL}
      alt={BRAND_NAME}
      className={cn(SIZES[size], "w-auto object-contain", className)}
    />
  );
}
