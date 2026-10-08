// ROAS is a number the team enters by hand (there is no revenue field to
// derive it from), so a blank usually means "not entered yet", not zero.
export function RoasValue({ roas, adSpend }: { roas: number | null; adSpend: number | null }) {
  if (roas != null) return <>{roas}x</>;
  const hint =
    adSpend == null
      ? "No ad spend or ROAS entered yet. Edit the campaign to add them."
      : "ROAS hasn't been entered yet. Edit the campaign to add the measured return.";
  return (
    <span title={hint} className="cursor-help underline decoration-dotted underline-offset-4">
      —
    </span>
  );
}
