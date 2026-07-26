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
  { color: "#90b5e4", text: "#141414", code: "DYOR / 01", quarter: "Q3 2026", blurb: "Concepting in motion. Brief stays under wraps until launch week." },
  { color: "#94bef0", text: "#141414", code: "DYOR / 02", quarter: "Q3 2026", blurb: "Early production. Storyboards drying on the studio wall." },
  { color: "#a9d6fa", text: "#141414", code: "DYOR / 03", quarter: "Q4 2026", blurb: "Scripts in review. First cut scheduled for next sprint." },
  { color: "#75a1dd", text: "#141414", code: "DYOR / 04", quarter: "Q4 2026", blurb: "Shot list locked. Waiting on golden-hour weather." },
  { color: "#90b5e4", text: "#141414", code: "DYOR / 05", quarter: "Q3 2026", blurb: "Asset library growing. Full reveal closer to go-live." },
  { color: "#94bef0", text: "#141414", code: "DYOR / 06", quarter: "Q4 2026", blurb: "Creative direction approved. Into production this month." },
  { color: "#a9d6fa", text: "#141414", code: "DYOR / 07", quarter: "Q1 2027", blurb: "Kickoff complete. Deliverables pending internal review." },
  { color: "#75a1dd", text: "#141414", code: "DYOR / 08", quarter: "Q4 2026", blurb: "Reels in the edit bay. Sound design still cooking." },
  { color: "#90b5e4", text: "#141414", code: "DYOR / 09", quarter: "Q1 2027", blurb: "Moodboard signed off. Shoot dates locking in soon." },
  { color: "#94bef0", text: "#141414", code: "DYOR / 10", quarter: "Q3 2026", blurb: "Campaign framework drafted. Full brief classified for now." },
  { color: "#a9d6fa", text: "#141414", code: "DYOR / 11", quarter: "Q1 2027", blurb: "Discovery phase. First deliverables due end of quarter." },
  { color: "#75a1dd", text: "#141414", code: "DYOR / 12", quarter: "Q4 2026", blurb: "Content calendar mapped. Production kicks off shortly." },
];
