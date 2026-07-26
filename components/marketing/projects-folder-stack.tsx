"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { UpcomingProject } from "@/lib/marketing/upcoming-projects";
import { cn } from "@/lib/utils";

// Overdamped on purpose — an underdamped spring overshoots past PULL_Y for a
// frame or two, which briefly outruns OVERLAP and flashes the background
// through the gap.
const SPRING = { type: "spring" as const, stiffness: 320, damping: 40 };

// How much of each folder's body the next one covers at rest — must stay
// under the body height so every tab (the top slice of each row) stays clear
// of the folder in front of it, and comfortably clear of PULL_Y below so the
// lifted folder never outruns the overlap and exposes the background.
const OVERLAP = 76;

// Only the hovered folder moves — its neighbors stay put. Because z-index
// ascends with index (below), the hovered folder is already guaranteed to
// render above every folder before it, so it never needs a z-index boost —
// and leaving the folder after it untouched (in both position and z-index)
// keeps that one fully visible instead of getting buried.
const PULL_Y = -36;

export function ProjectsFolderStack({ projects }: { projects: UpcomingProject[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const openProject = projects.find((p) => p.id === openId) ?? null;

  return (
    <div className="relative w-full max-w-4xl">
      <div
        className={cn(
          "flex flex-col transition-[filter,opacity,transform] duration-500 ease-out",
          openId ? "pointer-events-none scale-[0.98] opacity-40 blur-md" : "opacity-100"
        )}
        onMouseLeave={() => setHovered(null)}
      >
        {projects.map((project, i) => (
          <motion.button
            type="button"
            key={project.id}
            layoutId={`folder-${project.id}`}
            layout
            aria-label={`Open ${project.client} — Upcoming Project`}
            className="relative flex shrink-0 cursor-pointer flex-col border-none text-left outline-none"
            style={{ zIndex: i, marginTop: i === 0 ? 0 : -OVERLAP }}
            animate={{ y: hovered === i ? PULL_Y : 0 }}
            transition={SPRING}
            onMouseEnter={() => setHovered(i)}
            onFocus={() => setHovered(i)}
            onClick={() => setOpenId(project.id)}
          >
            {/* tab */}
            <div
              className="ml-6 flex h-8 w-fit items-center rounded-t-lg px-5 sm:ml-9"
              style={{ background: project.color }}
            >
              <span
                className="whitespace-nowrap font-[family-name:var(--font-syne)] text-[11px] font-bold uppercase tracking-[0.12em] sm:text-xs"
                style={{ color: project.text }}
              >
                {project.client}
              </span>
            </div>
            {/* body */}
            <div
              className="flex h-24 items-center justify-end rounded-tr-2xl rounded-bl-sm rounded-br-2xl px-5 shadow-[0_10px_24px_-16px_rgba(0,0,0,0.6)] sm:h-28 sm:px-8"
              style={{ background: project.color }}
            >
              <span
                className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-70 sm:text-[10px]"
                style={{ color: project.text }}
              >
                Upcoming Project
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {openProject && (
          <FolderDetail project={openProject} onClose={() => setOpenId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function FolderDetail({ project, onClose }: { project: UpcomingProject; onClose: () => void }) {
  return (
    <motion.div
      layoutId={`folder-${project.id}`}
      layout
      transition={SPRING}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: project.color }}
    >
      <video
        aria-hidden
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-[0.14] mix-blend-overlay"
        src="/video/hero-shader.mp4"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        className="relative mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to projects"
            className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-white/10"
            style={{ borderColor: `${project.text}40`, color: project.text }}
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
          <span
            className="font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.2em] opacity-70"
            style={{ color: project.text }}
          >
            {project.code}
          </span>
        </div>

        <div>
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.3em] opacity-70"
            style={{ color: project.text }}
          >
            Upcoming Project
          </span>
          <h2
            className="mt-2 font-[family-name:var(--font-syne)] text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl"
            style={{ color: project.text }}
          >
            {project.client}
          </h2>
        </div>

        {project.coverUrl && (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase storage URL, not in next.config remotePatterns */}
            <img src={project.coverUrl} alt={project.client} className="h-full w-full object-cover" />
          </div>
        )}

        <p
          className="max-w-xl text-lg leading-relaxed"
          style={{ color: project.text }}
        >
          {project.blurb}
        </p>

        <div
          className="flex flex-wrap gap-x-8 gap-y-2 border-t pt-6 font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.15em] opacity-70"
          style={{ borderColor: `${project.text}30`, color: project.text }}
        >
          <span>Target — {project.quarter}</span>
          <span>Status — In development</span>
          <span>Client — {project.client}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
