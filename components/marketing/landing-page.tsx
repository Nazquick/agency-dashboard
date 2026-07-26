import { DyorHero } from "@/components/marketing/dyor-hero";
import { DyorWordmark } from "@/components/branding/dyor-wordmark";
import { HeroCategories } from "@/components/marketing/hero-categories";
import { InlineSignIn } from "@/components/marketing/inline-sign-in";

const SCROLL_ROOT_ID = "landing-scroll";

export function LandingPage() {
  return (
    <div id={SCROLL_ROOT_ID} className="h-dvh snap-y snap-mandatory overflow-y-auto bg-white">
      {/* Section 1 — hero: nav chrome overlaying the interactive video mark */}
      <section className="relative flex h-dvh snap-start snap-always flex-col justify-center overflow-hidden">
        <DyorHero className="absolute inset-0" />

        <div className="pointer-events-none relative z-10 flex h-full flex-col justify-center px-6 sm:px-10">
          <header className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-6 sm:px-10 sm:pt-8">
            <DyorWordmark size="md" className="text-[#141414]" />
            <a
              href="#signin"
              className="rounded-full border border-[#141414]/20 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#141414] backdrop-blur-sm transition-colors hover:border-[#141414]/50 hover:bg-white"
            >
              Sign in
            </a>
          </header>
          <div className="absolute inset-x-6 top-20 border-t border-[#141414]/15 sm:inset-x-10 sm:top-24" />

          <div className="absolute bottom-6 right-6 flex flex-col items-end gap-4 sm:bottom-10 sm:right-10">
            <div aria-hidden className="flex flex-col items-center gap-2 text-[#141414]/40">
              <span className="font-[family-name:var(--font-syne)] text-[10px] uppercase tracking-[0.3em]">
                Scroll
              </span>
              <span className="h-8 w-px animate-pulse bg-[#141414]/30" />
            </div>
            <HeroCategories scrollRootId={SCROLL_ROOT_ID} />
          </div>
        </div>
      </section>

      {/* Section 2 — reveals on scroll: sign-in, inline */}
      <section
        id="signin"
        className="relative flex h-dvh snap-start snap-always flex-col items-center justify-center px-6"
      >
        <InlineSignIn />
      </section>

      {/* Section 3 — clients & work, placeholder for now */}
      <section className="relative flex h-dvh snap-start snap-always flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="font-[family-name:var(--font-syne)] text-[10px] font-medium uppercase tracking-[0.3em] text-[#141414]/50">
          Clients &amp; Work
        </span>
        <p className="max-w-md text-balance text-lg text-[#141414]/70">
          We&apos;re just getting started — selected work lands here soon.
        </p>
      </section>
    </div>
  );
}
