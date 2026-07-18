"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

const LETTERS = [
  { char: "Y", dx: -150, dy: -70, dz: 50, rx: -25, ry: 35, rz: -15 },
  { char: "O", dx: -95, dy: 95, dz: -55, rx: 30, ry: -20, rz: 20 },
  { char: "K", dx: -35, dy: -115, dz: 75, rx: -35, ry: 15, rz: 30 },
  { char: "U", dx: 45, dy: 105, dz: -65, rx: 25, ry: -30, rz: -20 },
  { char: "M", dx: 105, dy: -75, dz: 55, rx: -20, ry: 25, rz: 15 },
  { char: "E", dx: 160, dy: 55, dz: -45, rx: 35, ry: -15, rz: -30 },
] as const;

export function YokumeHero3D({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [bursting, setBursting] = useState(false);

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -18, y: px * 22 });
  }

  function handlePointerLeave() {
    setTilt({ x: 0, y: 0 });
  }

  function triggerBurst() {
    if (bursting) return;
    setBursting(true);
    window.setTimeout(() => setBursting(false), 1300);
  }

  return (
    <div
      ref={stageRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={triggerBurst}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          triggerBurst();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="YOKUME — click to scatter and reassemble the mark"
      className={cn("yokume-stage cursor-pointer touch-none select-none", className)}
    >
      <div
        className="yokume-scene flex items-center justify-center gap-1 md:gap-2"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        {LETTERS.map((l, i) => (
          <span
            key={l.char}
            aria-hidden
            className={cn(
              "yokume-letter font-[family-name:var(--font-syne)] font-extrabold text-[#f5f2ea]",
              bursting && "is-bursting"
            )}
            style={
              {
                "--i": i,
                "--dx": l.dx,
                "--dy": l.dy,
                "--dz": l.dz,
                "--rx": l.rx,
                "--ry": l.ry,
                "--rz": l.rz,
                fontSize: "clamp(2rem, 9vw, 9rem)",
                letterSpacing: "-0.01em",
                lineHeight: 1,
              } as CSSProperties
            }
          >
            {l.char}
          </span>
        ))}
      </div>
    </div>
  );
}
