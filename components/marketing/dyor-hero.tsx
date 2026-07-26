import { cn } from "@/lib/utils";

export function DyorHero({ className }: { className?: string }) {
  return (
    <div className={cn("dyor-hero-stage relative overflow-hidden", className)}>
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        src="/video/hero-shader.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-white/45" />
    </div>
  );
}
