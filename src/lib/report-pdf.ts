import { jsPDF } from "jspdf";
import type { MatchResult } from "../../shared/matching";

let fonts: Promise<string[]> | undefined;
function loadFonts() {
  fonts ??= Promise.all(["Regular", "Bold"].map(async (weight) => {
    const response = await fetch(`/fonts/NotoSans-${weight}.ttf`);
    if (!response.ok) throw new Error("Unable to load PDF font");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    return btoa(binary);
  })).catch((error) => { fonts = undefined; throw error; });
  return fonts;
}

export function createReportPdf(result: MatchResult, regular: string, bold: string) {
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true, putOnlyUsedFonts: true });
  pdf.addFileToVFS("NotoSans-Regular.ttf", regular);
  pdf.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  pdf.addFileToVFS("NotoSans-Bold.ttf", bold);
  pdf.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  pdf.setProperties({ title: "RoleLens Match Report", creator: "RoleLens" });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const margin = 44;
  let y = margin;
  let page = 1;

  function finishPage() {
    pdf.setFont("NotoSans", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor("#68776d");
    pdf.text("RoleLens • Match report", margin, height - 24);
    pdf.text(String(page++), width - margin, height - 24, { align: "right" });
  }
  function nextPage() {
    finishPage();
    pdf.addPage();
    y = margin;
  }
  function write(text: string, size = 11, bold = false) {
    const lineHeight = size * 1.5;
    pdf.setFont("NotoSans", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines: string[] = pdf.splitTextToSize(text, width - margin * 2);
    for (const line of lines) {
      if (y + lineHeight > height - margin) nextPage();
      pdf.setFont("NotoSans", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      pdf.setTextColor(bold ? "#174c3c" : "#24342c");
      pdf.text(line, margin, y + size);
      y += lineHeight;
    }
    y += 7;
  }
  function heading(text: string) {
    if (y + 65 > height - margin) nextPage();
    y += 8;
    write(text, 15, true);
  }
  write("rolelens.", 25, true);
  write("Your match report", 18, true);
  write(`${result.score}% — ${result.mode === "demo" ? "Local keyword preview" : "AI match score"}`, 20, true);
  write("This is a resume-to-role estimate, not an ATS score or a hiring prediction.");
  if (result.mode === "demo") write("Local preview: no AI request was made. Only skills are assessed.");
  heading("Score breakdown");
  result.breakdown.forEach((item) => write(`${item.label}: ${item.assessed ? item.score + "%" : "Not assessed"} • ${item.weight}% weight`));
  write("Unassessed categories are excluded; remaining weights are normalized.");
  heading("Summary");
  write(result.summary);
  for (const [title, entries] of [
    ["Skills", result.skills], ["Keywords", result.keywords],
  ] as const) {
    heading(title);
    if (!entries.length) write("Not assessed.");
    entries.forEach((item) => {
      write(`${item.skill} — ${item.matched ? "Matched" : "Gap to review"}`, 11, true);
      write(item.evidence || "No evidence provided.");
    });
  }
  for (const [title, entries] of [
    ["Experience", result.experience], ["Education", result.education],
  ] as const) {
    heading(title);
    if (!entries.length) write("Not assessed.");
    entries.forEach((item) => write(`${item.satisfied ? "Supported" : "Not supported"} — ${item.evidence}`));
  }
  heading("Suggested improvements");
  if (!result.suggestions.length) write("No specific suggestions found. Review the job requirements manually.");
  result.suggestions.forEach((item, index) => write(`${index + 1}. ${item}`));
  finishPage();
  return pdf;
}

export async function buildReportPdf(result: MatchResult) {
  const [regular, bold] = await loadFonts();
  return createReportPdf(result, regular, bold);
}

export async function downloadReportPdf(result: MatchResult, filename = "rolelens-match-report.pdf") {
  (await buildReportPdf(result)).save(filename);
}
