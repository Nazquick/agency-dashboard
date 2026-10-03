export interface ClientTheme {
  hex: string;
  // Text colour for solid-accent elements (e.g. today's date) — white fails
  // contrast on yellow.
  onAccent: string;
}

// Matched on the client's name rather than id so a renamed or re-created
// client keeps its colour. "Teaology" is the brand's own spelling; the
// client record is stored as "TEOLOGY".
const THEMES: { match: RegExp; theme: ClientTheme }[] = [
  { match: /te(a)?ology/i, theme: { hex: "#ec4899", onAccent: "#ffffff" } },
  { match: /ochaya/i, theme: { hex: "#22c55e", onAccent: "#ffffff" } },
  { match: /juun/i, theme: { hex: "#eab308", onAccent: "#1f2937" } },
];

export function clientThemeFor(name: string | null | undefined): ClientTheme | null {
  if (!name) return null;
  return THEMES.find((t) => t.match.test(name))?.theme ?? null;
}
