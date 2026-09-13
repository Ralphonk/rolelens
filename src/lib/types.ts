import type { MatchResult } from "../../shared/matching";
export type Resume = {
  id: string;
  name: string;
  text: string;
  createdAt: string;
};
export type Analysis = {
  id: string;
  title: string;
  company: string;
  createdAt: string;
  result: MatchResult;
  resumeId?: string;
};
export type User = { id: string; name: string; email: string };
