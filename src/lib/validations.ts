import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ─── Forms ───────────────────────────────────────────────────────────────────

export const fieldSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).default([]),
  validation: z.record(z.unknown()).default({}),
  position: z.number(),
  settings: z.record(z.unknown()).default({}),
});

export const formCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  theme: z.string().default("midnight"),
  fields: z.array(fieldSchema).default([]),
  settings: z.record(z.unknown()).default({}),
});

export const formUpdateSchema = formCreateSchema.partial();

// ─── Submissions ─────────────────────────────────────────────────────────────

export const submissionSchema = z.object({
  data: z.record(z.unknown()),
  metadata: z
    .object({
      userAgent: z.string().optional(),
      duration: z.number().optional(),
    })
    .optional(),
});

// ─── AI ──────────────────────────────────────────────────────────────────────

export const aiGenerateSchema = z.object({
  prompt: z.string().min(3).max(1000),
  language: z.string().optional().default("en"),
});
