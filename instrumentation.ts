// The deployment runs in UTC, but the team and the browsers are in Oslo.
// Server code that uses local-time Date methods (grouping posts by day,
// credit-period boundaries, the "Good evening" greeting) must agree with
// the browser, or the server HTML and the client render differ.
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = "Europe/Oslo";
  }
}
