// Framing of a thumbnail inside a square tile.
//
// The image is first scaled to *cover* the square (its short side equals the
// tile), then scaled up by `zoom`. `x`/`y` (0-1) are the point of the image
// that sits at the centre of the tile. All sizes below are expressed as a
// fraction of the tile side, so the same crop renders identically in the
// small feed tile and in the larger editor.

export interface ThumbnailCrop {
  zoom: number;
  x: number;
  y: number;
}

export const DEFAULT_CROP: ThumbnailCrop = { zoom: 1, x: 0.5, y: 0.5 };
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function cropFromPost(post: {
  thumbnail_zoom: number;
  thumbnail_focus_x: number;
  thumbnail_focus_y: number;
}): ThumbnailCrop {
  return { zoom: post.thumbnail_zoom, x: post.thumbnail_focus_x, y: post.thumbnail_focus_y };
}

// Rendered image size as a fraction of the tile side.
function imageSize(zoom: number, aspect: number) {
  return aspect >= 1 ? { w: aspect * zoom, h: zoom } : { w: zoom, h: zoom / aspect };
}

// Keep the tile fully covered: the focus point can't move so far that an
// empty edge shows.
export function clampCrop(crop: ThumbnailCrop, aspect: number): ThumbnailCrop {
  const zoom = clamp(crop.zoom, MIN_ZOOM, MAX_ZOOM);
  const { w, h } = imageSize(zoom, aspect);
  return {
    zoom,
    x: clamp(crop.x, 0.5 / w, 1 - 0.5 / w),
    y: clamp(crop.y, 0.5 / h, 1 - 0.5 / h),
  };
}

// Percentages for an absolutely positioned <img> inside the tile.
export function cropLayout(crop: ThumbnailCrop, aspect: number) {
  const c = clampCrop(crop, aspect);
  const { w, h } = imageSize(c.zoom, aspect);
  return {
    width: `${w * 100}%`,
    height: `${h * 100}%`,
    left: `${(0.5 - c.x * w) * 100}%`,
    top: `${(0.5 - c.y * h) * 100}%`,
  };
}

// Drag the picture by (dx, dy), each a fraction of the tile side.
export function panCrop(crop: ThumbnailCrop, aspect: number, dx: number, dy: number): ThumbnailCrop {
  const c = clampCrop(crop, aspect);
  const { w, h } = imageSize(c.zoom, aspect);
  return clampCrop({ zoom: c.zoom, x: c.x - dx / w, y: c.y - dy / h }, aspect);
}

export function zoomCrop(crop: ThumbnailCrop, aspect: number, zoom: number): ThumbnailCrop {
  return clampCrop({ ...crop, zoom }, aspect);
}

export function sameCrop(a: ThumbnailCrop, b: ThumbnailCrop): boolean {
  return Math.abs(a.zoom - b.zoom) < 0.001 && Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}
