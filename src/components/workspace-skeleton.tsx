export function WorkspaceSkeleton({ view }: { view: string }) {
  const insights = view === "Insights";
  const form = view === "New match";
  return (
    <div className="workspace-skeleton" role="status" aria-label={`Loading ${view}`}>
      <div aria-hidden="true">
        <div className="skeleton-bar skeleton-eyebrow" />
        <div className="skeleton-bar skeleton-heading" />
        <div className="skeleton-bar skeleton-description" />
        {form && <div className="skeleton-bar skeleton-steps" />}
        <div className={insights ? "stats-grid" : form ? "skeleton-form-grid" : "library-grid"}>
          {Array.from({ length: form ? 2 : 3 }, (_, index) => (
            <div className="card skeleton-card" key={index}>
              <div className="skeleton-bar skeleton-label" />
              <div className={`skeleton-bar ${form ? "skeleton-input" : insights ? "skeleton-number" : "skeleton-preview"}`} />
              {!insights && <div className="skeleton-bar skeleton-description" />}
            </div>
          ))}
        </div>
        {insights && <div className="card skeleton-card"><div className="skeleton-bar skeleton-label" /><div className="skeleton-bar skeleton-chart" /></div>}
      </div>
    </div>
  );
}
