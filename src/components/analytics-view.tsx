import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { Analysis } from "@/lib/types";
import { Button } from "./ui/button";
export function AnalyticsView({
  analyses,
  onStart,
}: {
  analyses: Analysis[];
  onStart: () => void;
}) {
  if (!analyses.length)
    return (
      <div className="empty-state">
        <h2>Your patterns will take shape here.</h2>
        <p>
          Run and save an AI analysis to see your average score and recurring
          skill gaps.
        </p>
        <Button onClick={onStart}>Start a match</Button>
      </div>
    );
  const missing: Record<string, number> = {};
  analyses.forEach((a) =>
    a.result.skills
      .filter((s) => !s.matched)
      .forEach((s) => (missing[s.skill] = (missing[s.skill] || 0) + 1)),
  );
  const data = Object.entries(missing)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([skill, count]) => ({ skill, count }));
  return (
    <>
      <div className="stats-grid">
        {[
          ["Analyses saved", analyses.length],
          [
            "Average match",
            Math.round(
              analyses.reduce((s, a) => s + a.result.score, 0) /
                analyses.length,
            ) + "%",
          ],
          [
            "Best match",
            Math.max(...analyses.map((a) => a.result.score)) + "%",
          ],
        ].map(([label, value]) => (
          <section className="card stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </section>
        ))}
      </div>
      <section className="card">
        <h2>Recurring skill gaps</h2>
        <p className="muted">
          Skills missing from your resume across analyzed roles.
        </p>
        {data.length ? (
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="skill" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#24634e" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>No recurring gaps identified.</p>
        )}
      </section>
    </>
  );
}
