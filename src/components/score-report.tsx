import {
  Check,
  Minus,
  ArrowUpRight,
  Download,
  FlaskConical,
} from "lucide-react";
import type { MatchResult } from "../../shared/matching";
import { Button } from "./ui/button";
import { useRef, useState } from "react";

export function ScoreReport({ result }: { result: MatchResult }) {
  const inFlight = useRef(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  async function download() {
    if (inFlight.current) return;
    inFlight.current = true;
    setExporting(true);
    setExportError("");
    try {
      // Open the picker before awaiting imports to preserve the click activation.
      const pickerWindow = window as Window & {
        showSaveFilePicker?: (options: {
          suggestedName: string;
          types: { description: string; accept: Record<string, string[]> }[];
        }) => Promise<{
          createWritable: () => Promise<{
            write: (data: Blob) => Promise<void>;
            close: () => Promise<void>;
            abort: () => Promise<void>;
          }>;
        }>;
      };
      const handle = pickerWindow.showSaveFilePicker
        ? await pickerWindow.showSaveFilePicker({
            suggestedName: "rolelens-match-report.pdf",
            types: [{ description: "PDF report", accept: { "application/pdf": [".pdf"] } }],
          })
        : undefined;
      const { downloadReportPdf, buildReportPdf } = await import("../lib/report-pdf");
      if (handle) {
        const pdf = await buildReportPdf(result);
        const writable = await handle.createWritable();
        try {
          await writable.write(pdf.output("blob"));
          await writable.close();
        } catch (error) {
          await writable.abort().catch(() => {});
          throw error;
        }
      } else {
        await downloadReportPdf(result);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setExportError("The PDF could not be downloaded. Please try again.");
    } finally {
      inFlight.current = false;
      setExporting(false);
    }
  }
  return (
    <section className="report" aria-label="Match report">
      <div className="section-title">
        <div>
          <span className="eyebrow">YOUR MATCH REPORT</span>
          <h2>A clearer picture of your fit.</h2>
        </div>
        <Button className="report-export" variant="outline" onClick={download} disabled={exporting} aria-busy={exporting}>
          <Download size={16} /> {exporting ? "Preparing PDF…" : "Export PDF"}
        </Button>
      </div>
      {exportError && <p className="error" role="alert">{exportError}</p>}
      {result.mode === "demo" && (
        <p className="notice">
          <FlaskConical size={17} /> Local keyword preview · No AI request was
          made. Only skills are assessed.
        </p>
      )}
      <div className="report-grid">
        <div className="score-card">
          <div
            className="score-ring"
            style={{
              background: `conic-gradient(var(--green) ${result.score * 3.6}deg, #e7ece6 0deg)`,
            }}
          >
            <div>
              <strong>
                {result.score}
                <span>%</span>
              </strong>
              <small>
                {result.mode === "demo" ? "keyword match" : "match score"}
              </small>
            </div>
          </div>
          <h3>
            {result.score >= 75
              ? "A promising match"
              : result.score >= 45
                ? "Room to strengthen your fit"
                : "Explore the gaps"}
          </h3>
          <p>
            This is a resume-to-role estimate, not an ATS score or a hiring
            prediction.
          </p>
        </div>
        <div className="breakdown-card">
          <h3>What goes into your score</h3>
          {result.breakdown.map((b) => (
            <div className="metric" key={b.label}>
              <div>
                <span>
                  {b.label} <small>{b.weight}% weight</small>
                </span>
                <b>{b.assessed ? b.score + "%" : "Not assessed"}</b>
              </div>
              <div className="progress">
                <i style={{ width: (b.assessed ? b.score : 0) + "%" }} />
              </div>
            </div>
          ))}
          <small>
            Unassessed categories are excluded; remaining weights are
            normalized.
          </small>
        </div>
      </div>
      <div className="skills-grid">
        <article className="card">
          <h3>
            <Check size={18} /> Skills you bring
          </h3>
          <div className="chips">
            {result.skills
              .filter((x) => x.matched)
              .map((s) => (
                <span className="chip matched" key={s.skill}>
                  {s.skill}
                </span>
              ))}
          </div>
          {!result.skills.some((s) => s.matched) && (
            <p>No matching skills found.</p>
          )}
        </article>
        <article className="card">
          <h3>
            <Minus size={18} /> Gaps to review
          </h3>
          <div className="chips">
            {result.skills
              .filter((x) => !x.matched)
              .map((s) => (
                <span className="chip missing" key={s.skill}>
                  {s.skill}
                </span>
              ))}
          </div>
          {!result.skills.some((s) => !s.matched) && (
            <p>No missing skills identified.</p>
          )}
        </article>
      </div>
      <article className="card">
        <h3>Make your next version stronger</h3>
        <p className="muted">{result.summary}</p>
        {result.suggestions.map((s, i) => (
          <div className="recommendation" key={i}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <p>{s}</p>
            <ArrowUpRight size={17} />
          </div>
        ))}
        {!result.suggestions.length && (
          <p>
            No specific suggestions found. Review the job requirements manually.
          </p>
        )}
      </article>
      <details className="card evidence">
        <summary>See the evidence behind the assessment</summary>
        {result.skills.map((s, i) => (
          <p key={i}>
            <strong>{s.skill}</strong> — {s.evidence}
          </p>
        ))}
        {[...result.experience, ...result.education].map((e, i) => (
          <p key={"e" + i}>
            {e.satisfied ? "Supported" : "Not supported"} — {e.evidence}
          </p>
        ))}
      </details>
    </section>
  );
}
