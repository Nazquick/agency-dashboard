"use client";

import { useEffect, useState } from "react";

const SERVICES = [
  "DESIGN",
  "GRAPHIC",
  "FILM",
  "PHOTO",
  "PR",
  "WEB",
  "ANALYTICS",
  "STRATEGY",
  "CONSULTING",
];

// Reveals one category at a time as the hero scrolls toward the sign-in
// section — progress 0 (top of hero) shows nothing, progress 1 (start of
// section 2) shows all of them.
export function HeroCategories({ scrollRootId }: { scrollRootId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = document.getElementById(scrollRootId);
    if (!container) return;

    function onScroll() {
      if (!container) return;
      const p = container.scrollTop / (window.innerHeight || 1);
      setProgress(Math.min(1, Math.max(0, p)));
    }

    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [scrollRootId]);

  return (
    <div aria-hidden className="flex flex-col items-end gap-1">
      {SERVICES.map((service, i) => {
        const reveal = Math.min(1, Math.max(0, progress * SERVICES.length - i));
        return (
          <span
            key={service}
            className="font-[family-name:var(--font-syne)] text-[10px] font-medium uppercase tracking-[0.24em] text-[#141414]/50 transition-[opacity,transform] duration-300 ease-out sm:text-xs"
            style={{
              opacity: reveal,
              transform: `translateY(${(1 - reveal) * 6}px)`,
            }}
          >
            {service}
          </span>
        );
      })}
    </div>
  );
}
