"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  DEFAULT_CROP,
  MAX_ZOOM,
  MIN_ZOOM,
  cropLayout,
  panCrop,
  sameCrop,
  zoomCrop,
  type ThumbnailCrop,
} from "@/lib/social-posts/crop";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ZOOM_STEP = 0.25;

// A square tile showing an image with a given crop. With `onChange` it is
// interactive: drag to move the picture, scroll wheel to zoom (and +/- buttons
// when controls="buttons"). Without it, it is a plain read-only render, so the
// feed tile and the editor can never disagree about how a crop looks.
export function CropFrame({
  src,
  crop,
  onChange,
  onAspect,
  controls = "none",
  className = "relative aspect-square",
}: {
  src: string;
  crop: ThumbnailCrop;
  onChange?: (crop: ThumbnailCrop) => void;
  onAspect?: (aspect: number) => void;
  controls?: "none" | "buttons";
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragFrom = useRef<{ x: number; y: number } | null>(null);
  const [aspect, setAspect] = useState(1);
  const [loaded, setLoaded] = useState(false);

  // Pointer and wheel events can arrive faster than React re-renders, so they
  // read the latest values from refs instead of a stale closure.
  const latest = useRef({ crop, aspect, onChange });
  useEffect(() => {
    latest.current = { crop, aspect, onChange };
  });

  const interactive = Boolean(onChange);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || !interactive) return;
    // React's own onWheel is passive, so scrolling the page can't be
    // prevented there; this needs a native non-passive listener.
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const { crop: c, aspect: a, onChange: change } = latest.current;
      const next = zoomCrop(c, a, c.zoom * Math.exp(-e.deltaY * 0.002));
      latest.current.crop = next;
      change?.(next);
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [interactive]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragFrom.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const from = dragFrom.current;
    if (!from) return;
    const { crop: c, aspect: a, onChange: change } = latest.current;
    const size = e.currentTarget.getBoundingClientRect().width || 1;
    const next = panCrop(c, a, (e.clientX - from.x) / size, (e.clientY - from.y) / size);
    dragFrom.current = { x: e.clientX, y: e.clientY };
    latest.current.crop = next;
    change?.(next);
  }

  function endDrag() {
    dragFrom.current = null;
  }

  function nudgeZoom(delta: number) {
    onChange?.(zoomCrop(crop, aspect, crop.zoom + delta));
  }

  return (
    <div
      ref={frameRef}
      className={cn(
        "overflow-hidden bg-muted",
        interactive && "cursor-grab touch-none active:cursor-grabbing",
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        onLoad={(e) => {
          const { naturalWidth, naturalHeight } = e.currentTarget;
          if (naturalWidth && naturalHeight) {
            setAspect(naturalWidth / naturalHeight);
            onAspect?.(naturalWidth / naturalHeight);
          }
          setLoaded(true);
        }}
        className={cn("absolute max-w-none select-none transition-opacity", loaded ? "opacity-100" : "opacity-0")}
        style={cropLayout(crop, aspect)}
      />
      {interactive && controls === "buttons" && (
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-1 pt-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="size-6"
            onClick={() => nudgeZoom(-ZOOM_STEP)}
            disabled={crop.zoom <= MIN_ZOOM}
            aria-label="Zoom out"
          >
            <Minus className="size-3" />
          </Button>
          <span className="min-w-8 text-center text-[10px] font-medium tabular-nums text-white">
            {Math.round(crop.zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="size-6"
            onClick={() => nudgeZoom(ZOOM_STEP)}
            disabled={crop.zoom >= MAX_ZOOM}
            aria-label="Zoom in"
          >
            <Plus className="size-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// The crop editor used in the post dialog: a draggable square plus a zoom
// slider and reset, always showing exactly what the feed tile will show.
export function CropEditor({
  src,
  crop,
  onChange,
}: {
  src: string;
  crop: ThumbnailCrop;
  onChange: (crop: ThumbnailCrop) => void;
}) {
  const [aspect, setAspect] = useState(1);
  return (
    <div className="w-44 space-y-2">
      <CropFrame src={src} crop={crop} onChange={onChange} onAspect={setAspect} className="relative aspect-square rounded-md border" />
      <div className="flex items-center gap-2">
        <Minus className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          onChange={(e) => onChange(zoomCrop(crop, aspect, Number(e.target.value)))}
          className="h-1.5 w-full cursor-pointer accent-primary"
          aria-label="Zoom"
        />
        <Plus className="size-3.5 shrink-0 text-muted-foreground" />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Drag to move</span>
        <button
          type="button"
          className="underline-offset-4 hover:text-foreground hover:underline disabled:no-underline disabled:opacity-40"
          onClick={() => onChange(DEFAULT_CROP)}
          disabled={sameCrop(crop, DEFAULT_CROP)}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
