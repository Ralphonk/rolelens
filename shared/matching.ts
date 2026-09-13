export type Evidence = { skill: string; matched: boolean; evidence: string };
export type Extraction = {
  skills: Evidence[];
  experience: { satisfied: boolean; evidence: string }[];
  keywords: Evidence[];
  education: { satisfied: boolean; evidence: string }[];
  suggestions: string[];
  summary: string;
};
export type MatchResult = Extraction & {
  score: number;
  breakdown: {
    label: string;
    weight: number;
    score: number;
    assessed: boolean;
  }[];
  mode: "ai" | "demo";
};
export function calculateScore(
  input: Extraction,
  mode: MatchResult["mode"] = "ai",
): MatchResult {
  const ratio = (items: boolean[]) =>
    items.length
      ? Math.round((items.filter(Boolean).length / items.length) * 100)
      : 0;
  const breakdown = [
    {
      label: "Skills",
      weight: 50,
      score: ratio(input.skills.map((x) => x.matched)),
      assessed: input.skills.length > 0,
    },
    {
      label: "Experience",
      weight: 25,
      score: ratio(input.experience.map((x) => x.satisfied)),
      assessed: input.experience.length > 0,
    },
    {
      label: "Keywords",
      weight: 15,
      score: ratio(input.keywords.map((x) => x.matched)),
      assessed: input.keywords.length > 0,
    },
    {
      label: "Education",
      weight: 10,
      score: ratio(input.education.map((x) => x.satisfied)),
      assessed: input.education.length > 0,
    },
  ];
  const totalWeight = breakdown
    .filter((x) => x.assessed)
    .reduce((s, x) => s + x.weight, 0);
  const score = totalWeight
    ? Math.round(
        breakdown
          .filter((x) => x.assessed)
          .reduce((s, x) => s + x.score * x.weight, 0) / totalWeight,
      )
    : 0;
  return { ...input, score, breakdown, mode };
}
const vocabulary = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Express",
  "PostgreSQL",
  "Prisma",
  "REST APIs",
  "Docker",
  "AWS",
  "Git",
  "Python",
  "SQL",
  "Tailwind CSS",
  "Jest",
  "Playwright",
  "GraphQL",
  "MongoDB",
  "Figma",
  "HTML",
  "CSS",
  "CI/CD",
  "Redis",
  "Kubernetes",
];
const aliases: Record<string, string[]> = {
  "Next.js": ["nextjs"],
  "Node.js": ["nodejs"],
  "REST APIs": ["rest api", "restful"],
  "Tailwind CSS": ["tailwind"],
  PostgreSQL: ["postgres"],
};
function contains(text: string, term: string) {
  return [term, ...(aliases[term] || [])].some((t) => {
    const escaped = t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("(^|[^a-z0-9])" + escaped + "($|[^a-z0-9])", "i").test(
      text,
    );
  });
}
export function demoMatch(resume: string, job: string): MatchResult {
  const skills = vocabulary
    .filter((s) => contains(job, s))
    .map((skill) => ({
      skill,
      matched: contains(resume, skill),
      evidence: contains(resume, skill)
        ? "Found in the resume text."
        : "Not found in the resume text.",
    }));
  return calculateScore(
    {
      skills,
      experience: [],
      keywords: [],
      education: [],
      summary:
        "Local keyword preview. This checks a limited technology vocabulary, not experience, education or semantic relevance. Run an AI analysis for a fuller assessment.",
      suggestions: skills
        .filter((s) => !s.matched)
        .slice(0, 4)
        .map(
          (s) =>
            "If you have " +
            s.skill +
            " experience, add a specific, truthful example to your resume.",
        ),
    },
    "demo",
  );
}
export const sampleResume =
  "Aarav Sharma — Frontend Developer\n2 years of experience building responsive web applications.\nSkills: React, TypeScript, JavaScript, Next.js, HTML, CSS, Tailwind CSS, REST APIs, Git, Figma.\nBuilt a React analytics dashboard used by 300 users. Reduced page load time by 35% through lazy loading and image optimization. Integrated REST APIs and built accessible, reusable components. Collaborated with designers and backend engineers.\nB.Tech in Computer Science, 2023.";
export const sampleJob =
  "Frontend Engineer at Linear\nWe are looking for a frontend engineer with 2+ years of experience. Build fast, accessible web experiences with React, TypeScript, Next.js and Tailwind CSS. Integrate REST APIs, collaborate with designers and improve performance. Experience with PostgreSQL, Docker, and Playwright is a plus. Familiarity with Git. Degree in Computer Science or equivalent practical experience.";
