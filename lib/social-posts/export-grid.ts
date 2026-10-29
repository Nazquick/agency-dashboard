import { cropRect, type ThumbnailCrop } from "@/lib/social-posts/crop";

const COLUMNS = 3;
const TILE = 360;
const GAP = 4;
const BACKGROUND = "#ffffff";

export interface GridExportItem {
  // Picture to draw (a signed URL); without one the tile is a caption card.
  imageUrl?: string;
  crop: ThumbnailCrop;
  caption: string;
  // Accent colour for the caption card.
  hex: string;
}

async function loadBitmap(url: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s*\S*$/, "")}…`;
  }
  return lines;
}

function drawCaptionCard(ctx: CanvasRenderingContext2D, x: number, y: number, item: GridExportItem) {
  ctx.fillStyle = `${item.hex}22`;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = item.hex;
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrapLines(ctx, item.caption, TILE - 48, 7);
  const lineHeight = 36;
  const top = y + TILE / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x + TILE / 2, top + i * lineHeight));
}

// Draws the feed exactly as it looks on screen (3 columns, first item top-left,
// every picture framed with its saved crop) and returns it as a PNG. Unlike
// the on-screen feed it is not paged: every item goes in.
export async function renderFeedGrid(items: GridExportItem[]): Promise<Blob> {
  const rows = Math.max(1, Math.ceil(items.length / COLUMNS));
  const canvas = document.createElement("canvas");
  canvas.width = COLUMNS * TILE + (COLUMNS - 1) * GAP;
  canvas.height = rows * TILE + (rows - 1) * GAP;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bitmaps = await Promise.all(items.map((i) => (i.imageUrl ? loadBitmap(i.imageUrl) : null)));

  items.forEach((item, index) => {
    const x = (index % COLUMNS) * (TILE + GAP);
    const y = Math.floor(index / COLUMNS) * (TILE + GAP);
    const bitmap = bitmaps[index];
    if (!bitmap) {
      drawCaptionCard(ctx, x, y, item);
      return;
    }
    const r = cropRect(item.crop, bitmap.width / bitmap.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, TILE, TILE);
    ctx.clip();
    ctx.drawImage(bitmap, x + r.left * TILE, y + r.top * TILE, r.width * TILE, r.height * TILE);
    ctx.restore();
    bitmap.close();
  });

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create the image."))),
      "image/png"
    )
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
