export default function PortalLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-24 animate-pulse rounded-lg border bg-card" />
      <div className="h-72 animate-pulse rounded-lg border bg-card" />
    </div>
  );
}
