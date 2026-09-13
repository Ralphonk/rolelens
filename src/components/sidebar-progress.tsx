export function SidebarProgress({
  signedIn, resumes, matches, onNavigate, onSignIn,
}: {
  signedIn: boolean;
  resumes: number;
  matches: number;
  onNavigate: (view: string) => void;
  onSignIn: () => void;
}) {
  return (
    <section className="sidebar-progress" aria-label="Workspace snapshot">
      <h2>YOUR PROGRESS</h2>
      {signedIn ? (
        <div className="sidebar-progress-counts">
          <button onClick={() => onNavigate("My resumes")}>
            <strong>{resumes >= 100 ? "100+" : String(resumes).padStart(2, "0")}</strong>
            <span>Resumes</span>
          </button>
          <button onClick={() => onNavigate("Match history")}>
            <strong>{matches >= 100 ? "100+" : String(matches).padStart(2, "0")}</strong>
            <span>AI matches</span>
          </button>
        </div>
      ) : (
        <button className="sidebar-progress-guest" onClick={onSignIn}>
          Sign in to save your progress <span aria-hidden="true">↗</span>
        </button>
      )}
    </section>
  );
}
