// Ordered around the hue wheel so index-adjacent colors (as assigned to a
// sorted list) stay visually distinct from one another.
export const COLOR_PALETTE = [
  "#dc2626", // red
  "#ea580c", // orange
  "#d97706", // amber
  "#65a30d", // lime
  "#16a34a", // green
  "#0d9488", // teal
  "#0891b2", // cyan
  "#2563eb", // blue
  "#4f46e5", // indigo
  "#7c3aed", // violet
  "#db2777", // pink
];

export function colorForId(id: string, palette: string[] = COLOR_PALETTE): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

// Assigns by position rather than hashing the id, so every item in a list up
// to palette.length long gets a guaranteed-distinct color (hashing can collide).
export function colorAtIndex(index: number, palette: string[] = COLOR_PALETTE): string {
  return palette[index % palette.length];
}
