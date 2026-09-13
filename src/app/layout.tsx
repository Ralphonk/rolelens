import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "RoleLens · Find your fit",
  description:
    "Understand how your resume matches a role, with evidence-based skill matching and actionable feedback.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
