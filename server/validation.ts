import { z } from "zod";
export const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((x) => x.trim().toLowerCase()),
  password: z.string().min(10).max(72),
});
export const registration = credentials.extend({
  name: z.string().trim().min(2).max(80),
});
export const resumeSchema = z.object({
  name: z.string().trim().min(1).max(180),
  text: z.string().trim().min(50).max(20000),
});
export const analysisSchema = z.object({
  resumeId: z.string().optional(),
  resumeText: z.string().trim().min(50).max(20000),
  title: z.string().trim().min(1).max(150),
  company: z.string().trim().min(1).max(150),
  description: z.string().trim().min(50).max(20000),
  consent: z.literal(true, {
    error: "Please agree to send these texts to Google Gemini.",
  }),
});
const evidence = z.object({
  skill: z.string().max(120),
  matched: z.boolean(),
  evidence: z.string().max(1000),
});
const requirement = z.object({
  satisfied: z.boolean(),
  evidence: z.string().max(1000),
});
export const extractionSchema = z.object({
  skills: z.array(evidence).max(40),
  experience: z.array(requirement).max(10),
  keywords: z.array(evidence).max(20),
  education: z.array(requirement).max(5),
  suggestions: z.array(z.string().max(1000)).max(6),
  summary: z.string().max(1500),
});
