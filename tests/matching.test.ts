import { describe, it, expect } from "vitest";
import {
  calculateScore,
  demoMatch,
  sampleResume,
  sampleJob,
} from "../shared/matching";
import { analysisSchema, resumeSchema } from "../server/validation";
describe("deterministic scoring", () => {
  it("computes weighted evidence rather than accepting an AI score", () => {
    const r = calculateScore({
      skills: [{ skill: "React", matched: true, evidence: "React" }],
      experience: [{ satisfied: false, evidence: "Missing" }],
      keywords: [{ skill: "API", matched: true, evidence: "API" }],
      education: [{ satisfied: true, evidence: "Degree" }],
      summary: "",
      suggestions: [],
    });
    expect(r.score).toBe(75);
  });
  it("does not give free points for unspecified requirements", () => {
    const r = calculateScore({
      skills: [],
      experience: [],
      keywords: [],
      education: [],
      summary: "",
      suggestions: [],
    });
    expect(r.score).toBe(0);
    expect(r.breakdown.every((x) => !x.assessed)).toBe(true);
  });
  it("normalizes weights only over assessed categories", () => {
    const r = demoMatch("React", "React and Docker");
    expect(r.score).toBe(50);
    expect(r.breakdown[1].assessed).toBe(false);
  });
  it("matches aliases without matching SQL inside PostgreSQL", () => {
    const r = demoMatch("nextjs and postgres", "Next.js PostgreSQL SQL");
    expect(r.skills.map((x) => x.matched)).toEqual([true, true, false]);
  });
  it("does not treat a dot as a wildcard", () => {
    expect(demoMatch("nextXjs", "Next.js").score).toBe(0);
  });
  it("produces useful sample differences", () => {
    const r = demoMatch(sampleResume, sampleJob);
    expect(r.mode).toBe("demo");
    expect(r.skills.find((s) => s.skill === "React")?.matched).toBe(true);
    expect(r.skills.find((s) => s.skill === "Docker")?.matched).toBe(false);
  });
  it("requires explicit consent for external AI processing", () => {
    expect(
      analysisSchema.safeParse({
        resumeText: sampleResume,
        title: "Role",
        company: "Company",
        description: sampleJob,
        consent: false,
      }).success,
    ).toBe(false);
  });
  it("limits stored resume text", () => {
    expect(
      resumeSchema.safeParse({ name: "Resume", text: "a".repeat(20001) })
        .success,
    ).toBe(false);
  });
});
