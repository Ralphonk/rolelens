"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import { Button } from "./ui/button";
import { AuthDialog } from "./auth-dialog";
import { SuccessToast } from "./success-toast";
import { LogoutDialog } from "./logout-dialog";
import { ConfirmDialog } from "./confirm-dialog";
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
  { name: "New match", shortName: "Match", icon: ScanLine },
  { name: "My resumes", shortName: "Resumes", icon: FileText },
  { name: "Match history", shortName: "History", icon: History },
  { name: "Insights", shortName: "Insights", icon: ChartNoAxesCombined },
];
const WORKSPACE_CACHE_TTL = 60_000;
const viewRoutes: Record<string, string> = {
  "New match": "/",
  "My resumes": "/resumes",
  "Match history": "/history",
  Insights: "/insights",
};
function viewForPath(pathname: string) {
  if (pathname === "/resumes") return "My resumes";
  if (pathname.startsWith("/resumes/")) return "Resume";
  if (pathname === "/history") return "Match history";
  if (pathname === "/insights") return "Insights";
  if (pathname.startsWith("/reports/")) return "Report";
  return "New match";
}
export function MatcherWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const view = viewForPath(pathname);
  const reportId = pathname.startsWith("/reports/")
    ? decodeURIComponent(pathname.slice("/reports/".length))
    : null;
  const resumeIdFromPath = pathname.startsWith("/resumes/")
    ? decodeURIComponent(pathname.slice("/resumes/".length))
    : null;
  const [initialLoading, setInitialLoading] = useState(true);
  const [pendingRefreshes, setPendingRefreshes] = useState(0);
  const [workspaceCacheLoaded, setWorkspaceCacheLoaded] = useState(false);
  const [successToast, setSuccessToast] = useState<{
    message: string;
    id: number;
    variant?: "success" | "error";
  } | null>(null);
  const dismissToast = useCallback(() => setSuccessToast(null), []);
  const showToast = (
    message: string,
    variant: "success" | "error" = "success",
  ) => setSuccessToast({ message, variant, id: Date.now() + Math.random() });
  const [user, setUser] = useState<User | null>(null),
    [authOpen, setAuthOpen] = useState(false),
    [resumes, setResumes] = useState<Resume[]>([]),
    [analyses, setAnalyses] = useState<Analysis[]>([]),
    [resume, setResume] = useState(""),
    [resumeFile, setResumeFile] = useState<File | null>(null),
    [resumeName, setResumeName] = useState(""),
    [resumeId, setResumeId] = useState<string | undefined>(),
    [job, setJob] = useState(""),
    [title, setTitle] = useState(""),
    [company, setCompany] = useState(""),
    [result, setResult] = useState<MatchResult | null>(null),
    [historyReport, setHistoryReport] = useState<Analysis | null>(null),
    [busy, setBusy] = useState(""),
    [mode, setMode] = useState<"demo" | "ai">("demo"),
    [consent, setConsent] = useState(false),
    [query, setQuery] = useState(""),
    [drag, setDrag] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null),
    reportRef = useRef<HTMLDivElement>(null),
    workspaceCacheUpdatedAt = useRef(0),
    expiredSessionHandled = useRef(false);
  const selectedResume = resumes.find((item) => item.id === resumeIdFromPath);
  useEffect(() => {
    api<User>("/auth/me")
      .then((u) => {
        setUser(u);
        setInitialLoading(false);
        void refresh();
      })
      .catch(() => setInitialLoading(false));
  }, []);
  useEffect(() => {
    if (!reportId) {
      setHistoryReport(null);
      return;
    }
    const report = analyses.find((item) => item.id === reportId);
    if (report) setHistoryReport(report);
  }, [analyses, reportId]);
  useEffect(() => {
    function handleExpiredSession() {
      if (expiredSessionHandled.current) return;
      expiredSessionHandled.current = true;
      setUser(null);
      setResumes([]);
      setAnalyses([]);
      setWorkspaceCacheLoaded(false);
      workspaceCacheUpdatedAt.current = 0;
      setResume("");
      setResumeFile(null);
      setResumeName("");
      setResumeId(undefined);
      setJob("");
      setTitle("");
      setCompany("");
      setResult(null);
      setHistoryReport(null);
      setMode("demo");
      setConsent(false);
      setAuthOpen(false);

      setSuccessToast(null);
      router.replace("/");
    }
    window.addEventListener("rolelens:session-expired", handleExpiredSession);
    return () =>
      window.removeEventListener(
        "rolelens:session-expired",
        handleExpiredSession,
      );
  }, [router]);
  async function refresh() {
    setPendingRefreshes((count) => count + 1);
    try {
      const [r, a] = await Promise.all([
        api<Resume[]>("/resumes"),
        api<Analysis[]>("/analyses"),
      ]);
      setResumes(r);
      setAnalyses(a);
      workspaceCacheUpdatedAt.current = Date.now();
      setWorkspaceCacheLoaded(true);
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setPendingRefreshes((count) => count - 1);
    }
  }
  function refreshWorkspaceIfStale() {
    if (
      !workspaceCacheLoaded ||
      Date.now() - workspaceCacheUpdatedAt.current >= WORKSPACE_CACHE_TTL
    ) {
      void refresh();
    }
  }
  function sample() {
    setResume(sampleResume);
    setResumeFile(null);
    setResumeName("Aarav_Sharma_Frontend.pdf");
    setResumeId(undefined);
    setJob(sampleJob);
    setTitle("Frontend Engineer");
    setCompany("Linear");
    setResult(null);

    showToast("Sample loaded. Edit either text, then run a local preview.");
  }
  function navigate(next: string) {
    if (next === view) return;
    router.push(viewRoutes[next] || "/");

    setQuery("");
    if (user && ["My resumes", "Match history", "Insights"].includes(next)) {
      refreshWorkspaceIfStale();
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Please choose a PDF under 5 MB.", "error");
      return;
    }
    setBusy("upload");

    try {
      const form = new FormData();
      form.append("file", file);
      const r = await api<{ text: string; name: string }>("/parse", {
        method: "POST",
        body: form,
      });
      setResume(r.text);
      setResumeFile(file);
      setResumeName(r.name);
      setResumeId(undefined);
      setResult(null);
      showToast("Text extracted. Please review it before analyzing.");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function analyze() {
    setBusy("analysis");

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
      showToast(mode === "demo" ? "Local match ready." : "Match report saved.");
      setTimeout(
        () =>
          reportRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        50,
      );
    } catch (e) {
      showToast((e as Error).message, "error");
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

    try {
      const form = new FormData();
      form.append("name", resumeName || "My resume");
      form.append("text", resume);
      if (resumeFile) form.append("file", resumeFile, resumeFile.name);
      const r = await api<Resume>("/resumes", {
        method: "POST",
        body: form,
      });
      setResumeId(r.id);
      await refresh();
      showToast("Resume saved to your workspace.");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  }
  const accountControls = user ? (
    <div className="topbar-user">
      <div className="topbar-user-meta">
        <span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span>
        <span className="topbar-user-text">
          <b>{user.name}</b>
          <small>{user.email}</small>
        </span>
      </div>
      <LogoutDialog
        disabled={!!busy}
        onConfirm={async () => {
          setBusy("logout");
          try {
            await api("/auth/logout", { method: "POST" });
            setUser(null);
            setResumes([]);
            setAnalyses([]);
            setWorkspaceCacheLoaded(false);
            workspaceCacheUpdatedAt.current = 0;
            setResume("");
            setResumeFile(null);
            setJob("");
            setResult(null);
            setHistoryReport(null);
            setResumeId(undefined);
            setMode("demo");
            router.replace("/");

            setSuccessToast({
              message: "Successfully logged out.",
              id: Date.now(),
            });
          } finally {
            setBusy("");
          }
        }}
      />
    </div>
  ) : (
    <Button variant="ghost" onClick={() => setAuthOpen(true)}>
      Sign in <ArrowUpRight size={16} />
    </Button>
  );
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
            {views.map(({ name, shortName, icon: Icon }) => (
              <button
                key={name}
                className={
                  view === name ||
                  (view === "Report" && name === "Match history") ||
                  (view === "Resume" && name === "My resumes")
                    ? "nav-active"
                    : ""
                }
                onClick={() => navigate(name)}
              >
                <Icon size={19} />
                <span className="nav-label-desktop">{name}</span>
                <span className="nav-label-mobile">{shortName}</span>
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
        <button
          className="profile desktop-profile"
          onClick={() => !user && setAuthOpen(true)}
        >
          <span className="avatar">
            {user ? user.name.slice(0, 2).toUpperCase() : "G"}
          </span>
          <span>
            <b>{user?.name || "Guest workspace"}</b>
            <small>{user?.email || "Explore before you sign up"}</small>
          </span>
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
              {view === "Report" ? (
                <>
                  <Link className="breadcrumb-link" href="/history">
                    Matching reports
                  </Link>
                  <ChevronRight size={14} />
                  <b>{historyReport?.title || "Report"}</b>
                </>
              ) : view === "Resume" ? (
                <>
                  <Link className="breadcrumb-link" href="/resumes">
                    My resumes
                  </Link>
                  <ChevronRight size={14} />
                  <b>{selectedResume?.name || "Resume"}</b>
                </>
              ) : (
                <b>{view}</b>
              )}
            </div>
          </header>
        </div>
        <main
          className="main-content"
          aria-busy={
            view !== "New match" &&
            view !== "Report" &&
            (initialLoading || (pendingRefreshes > 0 && !workspaceCacheLoaded))
          }
        >
          {view !== "New match" &&
          view !== "Report" &&
          (initialLoading ||
            (pendingRefreshes > 0 && !workspaceCacheLoaded)) ? (
            <WorkspaceSkeleton view={view} />
          ) : (
            <div key={view} className="workspace-page-enter">
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
                        <br className="desktop-break" /> a clearer{" "}
                        <em>match.</em>
                      </>
                    ) : view === "Report" && historyReport ? (
                      `${historyReport.title} at ${historyReport.company}`
                    ) : view === "Resume" && selectedResume ? (
                      selectedResume.name
                    ) : (
                      view
                    )}
                  </h1>
                  <p>
                    {view === "New match"
                      ? "See where you fit, find the gaps, and make your next application count."
                      : view === "Report"
                        ? "A saved report from your match history."
                        : view === "Resume" && selectedResume
                          ? `Saved ${new Date(selectedResume.createdAt).toLocaleDateString()}`
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
                ) : view === "Resume" && selectedResume ? (
                  <Button
                    onClick={() => {
                      setResume(selectedResume.text);
                      setResumeFile(null);
                      setResumeName(selectedResume.name);
                      setResumeId(selectedResume.id);
                      setResult(null);
                      navigate("New match");
                    }}
                  >
                    Use this resume <ArrowUpRight size={16} />
                  </Button>
                ) : (
                  <Button onClick={() => navigate("New match")}>
                    <Plus size={17} /> New match
                  </Button>
                )}
              </div>
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
                        <small>
                          PDF only · Up to 5 MB · Text-based documents
                        </small>
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
                        Skills, experience, and evidence. Not just a random
                        number.
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
                      I agree to send this resume text and job description to
                      Google Gemini for analysis. Free-tier inputs may be used
                      to improve Google products. Use sample or anonymized
                      resumes; do not submit sensitive personal data.
                    </label>
                  ) : (
                    <p className="privacy-line">
                      <ShieldCheck size={14} /> Local preview stays in your
                      browser. PDF extraction uses this app’s server; files are
                      not retained.
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
                          Find the skills that already make you a strong
                          candidate.
                        </p>
                      </div>
                      <div>
                        <ScanLine size={19} />
                        <h3>Spot the gaps</h3>
                        <p>
                          Understand what the role asks for and what’s missing.
                        </p>
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
                          <h2>
                            <Link
                              className="resume-name-link"
                              href={`/resumes/${encodeURIComponent(r.id)}`}
                            >
                              {r.name}
                            </Link>
                          </h2>
                          <small>
                            Added {new Date(r.createdAt).toLocaleDateString()} ·{" "}
                            {r.pdfAvailable ? "PDF saved" : "Text only"}
                          </small>
                          <p>{r.text.slice(0, 140)}…</p>
                          <div className="row-actions">
                            <Link
                              className="button button-ghost resume-view-button"
                              href={`/resumes/${encodeURIComponent(r.id)}`}
                            >
                              View resume <ArrowUpRight size={15} />
                            </Link>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setResume(r.text);
                                setResumeFile(null);
                                setResumeName(r.name);
                                setResumeId(r.id);
                                setResult(null);
                                navigate("New match");
                              }}
                            >
                              Use this resume <ArrowUpRight size={15} />
                            </Button>
                            <ConfirmDialog
                              title="Delete this resume?"
                              description="This saved resume will be removed permanently. Existing match reports will be retained."
                              confirmLabel="Delete resume"
                              onConfirm={async () => {
                                setBusy("delete");
                                try {
                                  await api("/resumes/" + r.id, {
                                    method: "DELETE",
                                  });
                                  setResumes((current) =>
                                    current.filter((item) => item.id !== r.id),
                                  );
                                  if (resumeId === r.id) setResumeId(undefined);

                                  setSuccessToast({
                                    message: "Resume deleted.",
                                    id: Date.now(),
                                  });
                                } finally {
                                  setBusy("");
                                }
                              }}
                              trigger={
                                <button
                                  aria-label={"Delete " + r.name}
                                  className="icon-button"
                                  disabled={!!busy}
                                >
                                  <Trash2 size={17} />
                                </button>
                              }
                            />
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
              {view === "Resume" &&
                (selectedResume ? (
                  <article className="card resume-detail">
                    <div className="resume-document-heading">
                      <div>
                        <span className="eyebrow">RESUME CONTENT</span>
                        <h2>Full resume</h2>
                      </div>
                      <small>
                        Added{" "}
                        {new Date(
                          selectedResume.createdAt,
                        ).toLocaleDateString()}
                      </small>
                    </div>
                    {selectedResume.pdfAvailable ? (
                      <iframe
                        className="resume-pdf-viewer"
                        src={`/api/resumes/${encodeURIComponent(selectedResume.id)}/pdf`}
                        title={`PDF preview of ${selectedResume.name}`}
                      />
                    ) : (
                      <>
                        <div className="notice resume-pdf-unavailable">
                          The original PDF was not stored with this resume. This
                          saved version contains extracted text only. Upload and
                          save the PDF again to keep a viewable copy.
                        </div>
                        <pre className="resume-document-text">
                          {selectedResume.text}
                        </pre>
                      </>
                    )}
                  </article>
                ) : (
                  <Empty
                    title={
                      user
                        ? "Resume not found."
                        : "Sign in to view this resume."
                    }
                    text={
                      user
                        ? "This saved resume may have been deleted."
                        : "Your saved resumes are available after you sign in."
                    }
                    action={() =>
                      user ? navigate("My resumes") : setAuthOpen(true)
                    }
                    label={user ? "Back to my resumes" : "Sign in"}
                  />
                ))}
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
                            <div className="history-row" key={a.id}>
                              <button
                                className="history-open"
                                onClick={() => {
                                  setHistoryReport(a);
                                  router.push(
                                    `/reports/${encodeURIComponent(a.id)}`,
                                  );
                                }}
                              >
                                <span className="company-avatar">
                                  {a.company[0]}
                                </span>
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
                              <ConfirmDialog
                                title="Delete this match report?"
                                description={`${a.title} at ${a.company} will be removed permanently. Your saved resume will not be affected.`}
                                confirmLabel="Delete report"
                                onConfirm={async () => {
                                  setBusy(`delete-analysis:${a.id}`);
                                  try {
                                    await api(`/analyses/${a.id}`, {
                                      method: "DELETE",
                                    });
                                    setAnalyses((current) =>
                                      current.filter(
                                        (item) => item.id !== a.id,
                                      ),
                                    );

                                    setSuccessToast({
                                      message: "Match report deleted.",
                                      id: Date.now(),
                                    });
                                  } finally {
                                    setBusy("");
                                  }
                                }}
                                trigger={
                                  <button
                                    className="icon-button history-delete"
                                    aria-label={`Delete ${a.title} match report`}
                                    disabled={!!busy}
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                }
                              />
                            </div>
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
              {view === "Report" && historyReport && (
                <ScoreReport result={historyReport.result} />
              )}
            </div>
          )}
          <footer>
            <span>Built for your next chapter.</span>
            <span>
              rolelens <span className="footer-dot">✳</span>
            </span>
            <button
              className="text-button"
              onClick={() => {
                showToast(
                  "Scores estimate how documented experience matches a job, not your ability or likelihood of an offer. AI can make mistakes. Always review the evidence.",
                );
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
          expiredSessionHandled.current = false;
          setUser(u);
          refresh();

          setSuccessToast({
            message: registered
              ? "Account created successfully. You're signed in!"
              : "Successfully signed in. Welcome back!",
            id: Date.now(),
          });
        }}
      />
      {successToast && (
        <SuccessToast
          key={successToast.id}
          message={successToast.message}
          variant={successToast.variant}
          onDismiss={dismissToast}
        />
      )}
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
