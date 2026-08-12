// Supabase Storage object keys must be ASCII-safe — a filename containing
// æ/ø/å (or other accented characters) fails the upload outright if it's
// embedded directly in the storage path. Sanitize only the storage *key*;
// the original filename (with the real letters) is stored separately in
// the DB's file_name column, so display text is never affected.
const NORWEGIAN_MAP: Record<string, string> = {
  æ: "ae",
  Æ: "AE",
  ø: "o",
  Ø: "O",
  å: "aa",
  Å: "AA",
};

// U+0300-U+036F: Unicode "Combining Diacritical Marks" block, left behind
// by NFKD-decomposing an accented Latin letter (e.g. "e" + COMBINING
// ACUTE ACCENT after decomposing "é").
const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

export function sanitizeStorageFilename(name: string): string {
  const mapped = name.replace(/[æÆøØåÅ]/g, (ch) => NORWEGIAN_MAP[ch] ?? ch);
  return mapped
    .normalize("NFKD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_");
}
