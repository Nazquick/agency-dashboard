// Framing of a thumbnail inside a feed tile.
//
// The image is first scaled to *cover* the tile (its short side, relative to
// the tile, just fits), then scaled up by `zoom`. `x`/`y` (0-1) are the point
// of the image that sits at the centre of the tile. Everything below is
// expressed as a fraction of the tile's own width/height, so the same crop
// renders identically in the small feed tile and in the larger editor.

export interface ThumbnailCrop {
  zoom: number;
  x: number;
  y: number;
}

// Feed tiles are portrait 3:4 (width : height), like Instagram's profile grid.
export const TILE_ASPECT = 3 / 4;

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

// Rendered image size as a fraction of the tile's width (fw) and height (fh).
function imageFractions(zoom: number, aspect: number) {
  const tileHeight = 1 / TILE_ASPECT; // in tile widths
  // The image is wider than the tile (relative to height) -> height fits.
  const w = aspect >= TILE_ASPECT ? tileHeight * zoom * aspect : zoom;
  const h = aspect >= TILE_ASPECT ? tileHeight * zoom : zoom / aspect;
  return { fw: w, fh: h / tileHeight };
}

// Keep the tile fully covered: the focus point can't move so far that an
// empty edge shows.
export function clampCrop(crop: ThumbnailCrop, aspect: number): ThumbnailCrop {
  const zoom = clamp(crop.zoom, MIN_ZOOM, MAX_ZOOM);
  const { fw, fh } = imageFractions(zoom, aspect);
  return {
    zoom,
    x: clamp(crop.x, 0.5 / fw, 1 - 0.5 / fw),
    y: clamp(crop.y, 0.5 / fh, 1 - 0.5 / fh),
  };
}

// Where the picture sits inside the tile, as fractions of the tile's size.
export function cropRect(crop: ThumbnailCrop, aspect: number) {
  const c = clampCrop(crop, aspect);
  const { fw, fh } = imageFractions(c.zoom, aspect);
  return { width: fw, height: fh, left: 0.5 - c.x * fw, top: 0.5 - c.y * fh };
}

// Percentages for an absolutely positioned <img> inside the tile.
export function cropLayout(crop: ThumbnailCrop, aspect: number) {
  const r = cropRect(crop, aspect);
  return {
    width: `${r.width * 100}%`,
    height: `${r.height * 100}%`,
    left: `${r.left * 100}%`,
    top: `${r.top * 100}%`,
  };
}

// Drag the picture by (dx, dy), as fractions of the tile's width and height.
export function panCrop(crop: ThumbnailCrop, aspect: number, dx: number, dy: number): ThumbnailCrop {
  const c = clampCrop(crop, aspect);
  const { fw, fh } = imageFractions(c.zoom, aspect);
  return clampCrop({ zoom: c.zoom, x: c.x - dx / fw, y: c.y - dy / fh }, aspect);
}

export function zoomCrop(crop: ThumbnailCrop, aspect: number, zoom: number): ThumbnailCrop {
  return clampCrop({ ...crop, zoom }, aspect);
}

export function sameCrop(a: ThumbnailCrop, b: ThumbnailCrop): boolean {
  return Math.abs(a.zoom - b.zoom) < 0.001 && Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}
