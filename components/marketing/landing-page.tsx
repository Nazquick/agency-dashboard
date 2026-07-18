import Link from "next/link";
import { YokumeHero3D } from "@/components/marketing/yokume-hero-3d";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0a0b10]">
      {/* Atmosphere: warm glow behind the mark, faint blueprint grid, vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 45% at 50% 42%, rgba(201, 138, 79, 0.16), transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(245,242,234,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,242,234,1) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: "inset 0 0 180px 40px rgba(0,0,0,0.75)",
        }}
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col items-center justify-center gap-16 px-6 py-24 sm:gap-20">
        <YokumeHero3D />
        <p className="max-w-md text-center font-[family-name:var(--font-syne)] text-sm font-medium tracking-[0.32em] text-[#c9baa6] sm:text-base">
          THE ONLY TEAM YOU NEED
        </p>
      </div>

      <div className="relative flex justify-center pb-14">
        <Button
          asChild
          size="lg"
          className="h-12 rounded-full bg-[#f5f2ea] px-8 text-sm font-semibold tracking-wide text-[#151a2e] shadow-[0_8px_30px_rgba(245,242,234,0.15)] transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_40px_rgba(245,242,234,0.25)]"
        >
          <Link href="/login">Dashboard Sign In</Link>
        </Button>
      </div>
    </div>
  );
}
