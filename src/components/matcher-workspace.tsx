"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScanLine,
  Sparkles,
  FileText,
  History,
  ChartNoAxesCombined,
  ArrowUpRight,
  UploadCloud,
  Check,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Plus,
  Trash2,
  LoaderCircle,
  CircleHelp,
  Search,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { AuthDialog } from "./auth-dialog";
import { SuccessToast } from "./success-toast";
import { LogoutDialog } from "./logout-dialog";
import { ScoreReport } from "./score-report";
import {
  demoMatch,
  sampleResume,
  sampleJob,
  type MatchResult,
} from "../../shared/matching";
import { api } from "@/lib/api";
import type { Analysis, Resume, User } from "@/lib/types";
import { AnalyticsView } from "./analytics-view";
import { WorkspaceSkeleton } from "./workspace-skeleton";
const views = [
  { name: "New match", icon: ScanLine },
  { name: "My resumes", icon: FileText },
  { name: "Match history", icon: History },
  { name: "Insights", icon: ChartNoAxesCombined },
];
export function MatcherWorkspace() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [pendingRefreshes, setPendingRefreshes] = useState(0);
  const [successToast, setSuccessToast] = useState<{message: string; id: number} | null>(null);
  const dismissToast = useCallback(() => setSuccessToast(null), []);
  const [view, setView] = useState("New match"),
    [user, setUser] = useState<User | null>(null),
    [authOpen, setAuthOpen] = useState(false),
    [resumes, setResumes] = useState<Resume[]>([]),
    [analyses, setAnalyses] = useState<Analysis[]>([]),
    [resume, setResume] = useState(""),
    [resumeName, setResumeName] = useState(""),
    [resumeId, setResumeId] = useState<string | undefined>(),
    [job, setJob] = useState(""),
    [title, setTitle] = useState(""),
    [company, setCompany] = useState(""),
    [result, setResult] = useState<MatchResult | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [mode, setMode] = useState<"demo" | "ai">("demo"),
    [consent, setConsent] = useState(false),
    [query, setQuery] = useState(""),
    [drag, setDrag] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null),
    reportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    api<User>("/auth/me")
      .then((u) => {
        setUser(u);
        return refresh();
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);
  async function refresh() {
    setPendingRefreshes((count) => count + 1);
    try {
      const [r, a] = await Promise.all([
        api<Resume[]>("/resumes"),
        api<Analysis[]>("/analyses"),
      ]);
      setResumes(r);
      setAnalyses(a);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPendingRefreshes((count) => count - 1);
    }
  }
  function sample() {
    setResume(sampleResume);
    setResumeName("Aarav_Sharma_Frontend.pdf");
    setResumeId(undefined);
    setJob(sampleJob);
    setTitle("Frontend Engineer");
    setCompany("Linear");
    setResult(null);
    setError("");
    setNotice("Sample loaded. Edit either text, then run a local preview.");
  }
  function navigate(next: string) {
    if (next === view) return;
    setView(next);
    setError("");
    setNotice("");
    setQuery("");
    if (user && ["My resumes", "Match history", "Insights"].includes(next)) {
      void refresh();
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Please choose a PDF under 5 MB.");
      return;
    }
    setBusy("upload");
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await api<{ text: string; name: string }>("/parse", {
        method: "POST",
        body: form,
      });
      setResume(r.text);
      setResumeName(r.name);
      setResumeId(undefined);
      setResult(null);
      setNotice("Text extracted. Please review it before analyzing.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function analyze() {
    setBusy("analysis");
    setError("");
    setNotice("");
    try {
      let report: MatchResult;
      if (mode === "demo") {
        report = demoMatch(resume, job);
        await new Promise((r) => setTimeout(r, 450));
      } else {
        if (!user) {
          setAuthOpen(true);
          return;
        }
        const a = await api<Analysis>("/analyses", {
          method: "POST",
          body: JSON.stringify({
            resumeText: resume,
            resumeId,
            title: title || "Untitled role",
            company: company || "Company",
            description: job,
            consent,
          }),
        });
        report = a.result;
        await refresh();
      }
      setResult(report);
      setTimeout(
        () =>
          reportRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        50,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function saveResume() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setBusy("save");
    setError("");
    try {
      const r = await api<Resume>("/resumes", {
        method: "POST",
        body: JSON.stringify({ name: resumeName || "My resume", text: resume }),
      });
      setResumeId(r.id);
      await refresh();
      setNotice("Resume saved to your workspace.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const accountControls = user ? (
    <div className="topbar-user">
      <div className="topbar-user-meta">
        <span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span>
        <span className="topbar-user-text"><b>{user.name}</b><small>{user.email}</small></span>
      </div>
      <LogoutDialog disabled={!!busy} onConfirm={async () => {
        setBusy("logout");
        try {
          await api("/auth/logout", { method: "POST" });
          setUser(null); setResumes([]); setAnalyses([]);
          setResume(""); setJob(""); setResult(null); setResumeId(undefined);
          setMode("demo"); setView("New match"); setNotice(""); setError("");
          setSuccessToast({ message: "Successfully logged out.", id: Date.now() });
        } finally { setBusy(""); }
      }} />
    </div>
  ) : <Button variant="ghost" onClick={() => setAuthOpen(true)}>Sign in <ArrowUpRight size={16} /></Button>;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-content">
        <div className="sidebar-brand-row">
        <a href="/" className="brand">
          <span>
            <ScanLine size={22} />
          </span>
          rolelens<span className="brand-dot">.</span>
        </a>
        <div className="mobile-account">{accountControls}</div>
        </div>
        <div className="workspace-caption">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {views.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={view === name ? "nav-active" : ""}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              {name}
              {name === "New match" && <Plus size={16} className="nav-end" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="note-icon">
            <Sparkles size={22} />
          </div>
          <h3>
            A little clarity.
            <br />A better next move.
          </h3>
          <p>Find the story your resume should be telling.</p>
          <span className="mini-line" />
        </div>
        <div className="sidebar-bottom">
          <ShieldCheck size={17} />
          <span>Your career. Your data.</span>
        </div>
        </div>
        <button className="profile desktop-profile" onClick={() => !user && setAuthOpen(true)}>
          <span className="avatar">{user ? user.name.slice(0, 2).toUpperCase() : "G"}</span>
          <span><b>{user?.name || "Guest workspace"}</b><small>{user?.email || "Explore before you sign up"}</small></span>
          {!user && <ChevronRight size={17} />}
        </button>
      </aside>
      <div className="workspace-main">
        <div className="workspace-header">
          <div className="account-strip">
            <span className="preview-pill desktop-preview">Early access</span>
            {accountControls}
          </div>
        <header className="topbar">
          <div>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <b>{view}</b>
          </div>
        </header>
        </div>
        <main className="main-content" aria-busy={initialLoading || (pendingRefreshes > 0 && view !== "New match" && view !== "Report")}>
          {initialLoading || (pendingRefreshes > 0 && view !== "New match" && view !== "Report") ? <WorkspaceSkeleton view={view} /> : <div key={view} className="workspace-page-enter">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {view === "New match"
                  ? "LESS GUESSWORK. MORE DIRECTION."
                  : "YOUR CAREER, IN FOCUS."}
              </span>
              <h1>
                {view === "New match" ? (
                  <>
                    The right role starts with
                    <br className="desktop-break" /> a clearer <em>match.</em>
                  </>
                ) : (
                  view
                )}
              </h1>
              <p>
                {view === "New match"
                  ? "See where you fit, find the gaps, and make your next application count."
                  : view === "My resumes"
                    ? "Keep the right version ready for every opportunity."
                    : view === "Match history"
                      ? "Every role you explored, with the details that matter."
                      : "Patterns from your saved AI match reports."}
              </p>
            </div>
            {view === "New match" ? (
              <Button variant="outline" onClick={sample} disabled={!!busy}>
                <Sparkles size={16} /> Try a sample
              </Button>
            ) : (
              <Button onClick={() => navigate("New match")}>
                <Plus size={17} /> New match
              </Button>
            )}
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <Check size={17} />
              {notice}
            </div>
          )}
          {view === "New match" && (
            <>
              <div className="stepper">
                <span className="step-active">
                  <b>1</b> Add your resume
                </span>
                <i />
                <span>
                  <b>2</b> Add the opportunity
                </span>
                <i />
                <span>
                  <b>3</b> Discover your fit
                </span>
              </div>
              <div className="input-grid">
                <section className="input-card">
                  <div className="card-heading">
                    <div className="card-icon">
                      <FileText size={21} />
                    </div>
                    <div>
                      <h2>Your experience</h2>
                      <p>Start with the story so far.</p>
                    </div>
                    <span className="step-number">01</span>
                  </div>
                  {resumes.length > 0 && (
                    <label className="saved-select">
                      Choose a saved resume
                      <select
                        value={resumeId || ""}
                        onChange={(e) => {
                          const r = resumes.find(
                            (r) => r.id === e.target.value,
                          );
                          if (r) {
                            setResume(r.text);
                            setResumeName(r.name);
                            setResumeId(r.id);
                            setResult(null);
                          }
                        }}
                      >
                        <option value="">Select a version…</option>
                        {resumes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".pdf,application/pdf"
                    hidden
                    onChange={(e) => upload(e.target.files?.[0])}
                  />
                  <button
                    className={"dropzone " + (drag ? "dragging" : "")}
                    disabled={!!busy}
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDrag(true);
                    }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDrag(false);
                      upload(e.dataTransfer.files[0]);
                    }}
                  >
                    <span className="upload-icon">
                      {busy === "upload" ? (
                        <LoaderCircle className="spin" size={25} />
                      ) : (
                        <UploadCloud size={25} />
                      )}
                    </span>
                    <strong>{resumeName || "Drop your resume here"}</strong>
                    <span>
                      {resumeName
                        ? "Choose a different file"
                        : "or click to browse files"}
                    </span>
                    <small>PDF only · Up to 5 MB · Text-based documents</small>
                  </button>
                  <div className="or-divider">
                    <span />
                    or paste your resume
                    <span />
                  </div>
                  <label className="sr-only" htmlFor="resume">
                    Resume text
                  </label>
                  <textarea
                    id="resume"
                    className="resume-text"
                    placeholder="Your skills, experience, and achievements…"
                    value={resume}
                    maxLength={20000}
                    onChange={(e) => {
                      setResume(e.target.value);
                      setResumeId(undefined);
                      setResult(null);
                    }}
                  />
                  <div className="input-footer">
                    <small>
                      {resume.length.toLocaleString()} / 20,000 characters
                    </small>
                    <button
                      className="text-button"
                      disabled={resume.length < 50 || !!busy}
                      onClick={saveResume}
                    >
                      {busy === "save" ? "Saving…" : "Save resume"}
                    </button>
                  </div>
                </section>
                <section className="input-card">
                  <div className="card-heading">
                    <div className="card-icon">
                      <ScanLine size={21} />
                    </div>
                    <div>
                      <h2>Your next opportunity</h2>
                      <p>What does your next chapter look like?</p>
                    </div>
                    <span className="step-number">02</span>
                  </div>
                  <div className="job-meta">
                    <label>
                      Job title
                      <input
                        placeholder="e.g. Frontend Engineer"
                        value={title}
                        maxLength={150}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </label>
                    <label>
                      Company
                      <input
                        placeholder="e.g. Linear"
                        value={company}
                        maxLength={150}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="job-label" htmlFor="job">
                    Job description <span>Required</span>
                  </label>
                  <textarea
                    id="job"
                    className="job-text"
                    placeholder={
                      "Paste the full job description here.\n\nInclude the responsibilities, required skills, and qualifications for a more useful match."
                    }
                    value={job}
                    maxLength={20000}
                    onChange={(e) => {
                      setJob(e.target.value);
                      setResult(null);
                    }}
                  />
                  <div className="input-footer">
                    <small>
                      {job.length.toLocaleString()} / 20,000 characters
                    </small>
                    <span className="private-note">
                      <ShieldCheck size={13} /> Private by design
                    </span>
                  </div>
                </section>
              </div>
              <div className="analysis-bar">
                <div>
                  <h3>A match score with meaning.</h3>
                  <p>
                    Skills, experience, and evidence. Not just a random number.
                  </p>
                  <div className="mode-control">
                    <label>
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === "demo"}
                        onChange={() => setMode("demo")}
                      />{" "}
                      Local preview
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === "ai"}
                        onChange={() => setMode("ai")}
                      />{" "}
                      AI analysis
                    </label>
                  </div>
                </div>
                <Button
                  disabled={
                    resume.trim().length < 50 ||
                    job.trim().length < 50 ||
                    !!busy ||
                    (mode === "ai" && !consent)
                  }
                  onClick={analyze}
                >
                  {busy === "analysis" ? (
                    <>
                      <LoaderCircle size={18} className="spin" /> Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      {mode === "demo"
                        ? "Preview my match"
                        : "Analyze my match"}
                      <ArrowRight size={17} />
                    </>
                  )}
                </Button>
              </div>
              {mode === "ai" ? (
                <label className="consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />{" "}
                  I agree to send this resume text and job description to Google Gemini
                  for analysis. Free-tier inputs may be used to improve Google products.
                  Use sample or anonymized resumes; do not submit sensitive personal data.
                </label>
              ) : (
                <p className="privacy-line">
                  <ShieldCheck size={14} /> Local preview stays in your browser.
                  PDF extraction uses this app’s server; files are not retained.
                </p>
              )}
              {result ? (
                <div ref={reportRef} className="report-anchor">
                  <ScoreReport result={result} />
                </div>
              ) : (
                <div className="how-it-works">
                  <div>
                    <span className="eyebrow">MORE THAN A PERCENTAGE</span>
                    <h2>Know what to work on next.</h2>
                  </div>
                  <div>
                    <Check size={19} />
                    <h3>See your strengths</h3>
                    <p>
                      Find the skills that already make you a strong candidate.
                    </p>
                  </div>
                  <div>
                    <ScanLine size={19} />
                    <h3>Spot the gaps</h3>
                    <p>Understand what the role asks for and what’s missing.</p>
                  </div>
                  <div>
                    <ArrowUpRight size={19} />
                    <h3>Make it actionable</h3>
                    <p>Turn feedback into a more focused, honest resume.</p>
                  </div>
                </div>
              )}
            </>
          )}
          {view === "My resumes" && (
            <>
              {!user ? (
                <Empty
                  title="Your experience deserves a home."
                  text="Sign in to save resume versions securely and reuse them in future matches."
                  action={() => setAuthOpen(true)}
                  label="Create your workspace"
                />
              ) : !resumes.length ? (
                <Empty
                  title="Your first version starts here."
                  text="Upload or paste a resume in New match, then choose Save resume."
                  action={() => navigate("New match")}
                  label="Add a resume"
                />
              ) : (
                <div className="library-grid">
                  {resumes.map((r) => (
                    <article className="card resume-library" key={r.id}>
                      <FileText size={28} />
                      <h2>{r.name}</h2>
                      <small>
                        Added {new Date(r.createdAt).toLocaleDateString()}
                      </small>
                      <p>{r.text.slice(0, 140)}…</p>
                      <div className="row-actions">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setResume(r.text);
                            setResumeName(r.name);
                            setResumeId(r.id);
                            setResult(null);
                            navigate("New match");
                          }}
                        >
                          Use this resume <ArrowUpRight size={15} />
                        </Button>
                        <button
                          aria-label={"Delete " + r.name}
                          className="icon-button"
                          disabled={!!busy}
                          onClick={async () => {
                            if (
                              !confirm(
                                "Delete this resume? Existing reports will be retained.",
                              )
                            )
                              return;
                            setBusy("delete");
                            try {
                              await api("/resumes/" + r.id, {
                                method: "DELETE",
                              });
                              await refresh();
                              if (resumeId === r.id) setResumeId(undefined);
                            } catch (e) {
                              setError((e as Error).message);
                            } finally {
                              setBusy("");
                            }
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
          {view === "Match history" && (
            <>
              {!user ? (
                <Empty
                  title="Keep a little perspective."
                  text="Sign in to save and revisit your AI analyses. Local previews are never saved."
                  action={() => setAuthOpen(true)}
                  label="Sign in"
                />
              ) : !analyses.length ? (
                <Empty
                  title="A fresh start."
                  text="Your saved AI reports will appear here after your first analysis."
                  action={() => navigate("New match")}
                  label="Find your first match"
                />
              ) : (
                <>
                  <label className="history-search">
                    <Search size={18} />
                    <input
                      placeholder="Search role or company"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <div className="card history-list">
                    {analyses
                      .filter((a) =>
                        (a.title + " " + a.company)
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((a) => (
                        <button
                          key={a.id}
                          onClick={() => {
                            setResult(a.result);
                            setView("Report");
                          }}
                        >
                          <span className="company-avatar">{a.company[0]}</span>
                          <span>
                            <b>{a.title}</b>
                            <small>
                              {a.company} ·{" "}
                              {new Date(a.createdAt).toLocaleDateString()}
                            </small>
                          </span>
                          <span className="match-pill">
                            {a.result.score}% match
                          </span>
                          <ArrowUpRight size={18} />
                        </button>
                      ))}
                    {!analyses.some((a) =>
                      (a.title + " " + a.company)
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    ) && <p>No matching reports.</p>}
                  </div>
                </>
              )}
            </>
          )}
          {view === "Insights" && (
            <AnalyticsView
              analyses={analyses}
              onStart={() => navigate("New match")}
            />
          )}
          {view === "Report" && result && <ScoreReport result={result} />}
          </div>}
          <footer>
            <span>Built for your next chapter.</span>
            <span>
              rolelens <span className="footer-dot">✳</span>
            </span>
            <button
              className="text-button"
              onClick={() => {
                setNotice(
                  "Scores estimate how documented experience matches a job, not your ability or likelihood of an offer. AI can make mistakes. Always review the evidence.",
                );
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <CircleHelp size={14} /> About matching
            </button>
          </footer>
        </main>
      </div>
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={(u, registered) => {
          setUser(u);
          refresh();
          setNotice("");
          setSuccessToast({message: registered ? "Account created successfully. You're signed in!" : "Successfully signed in. Welcome back!", id: Date.now()});
        }}
      />
      {successToast && <SuccessToast key={successToast.id} message={successToast.message} onDismiss={dismissToast} />}
    </div>
  );
}
function Empty({
  title,
  text,
  action,
  label,
}: {
  title: string;
  text: string;
  action: () => void;
  label: string;
}) {
  return (
    <div className="empty-state">
      <ScanLine size={34} />
      <h2>{title}</h2>
      <p>{text}</p>
      <Button onClick={action}>
        {label}
        <ArrowRight size={16} />
      </Button>
    </div>
  );
}
