export type UpcomingProject = {
  id: string;
  client: string;
  coverUrl: string | null;
  color: string;
  text: string;
  code: string;
  quarter: string;
  blurb: string;
};

// Positional metadata zipped with real clients (by index) in app/page.tsx.
// Colors cycle through the brand's blue set; text stays dark since all four
// are light enough that white would wash out.
export const PROJECT_META: Omit<UpcomingProject, "id" | "client" | "coverUrl">[] = [
  { color: "#90b5e4", text: "#141414", code: "DYOR / 01", quarter: "Q3 2026", blurb: "Multi-location campaign in motion. Full rollout details under wraps until launch week." },
  { color: "#94bef0", text: "#141414", code: "DYOR / 02", quarter: "Q3 2026", blurb: "Early production. Storyboards drying on the studio wall." },
  { color: "#a9d6fa", text: "#141414", code: "DYOR / 03", quarter: "Q4 2026", blurb: "Creative direction approved. Into production this month." },
  { color: "#75a1dd", text: "#141414", code: "DYOR / 04", quarter: "Q4 2026", blurb: "Kickoff complete. Deliverables pending internal review." },
];
