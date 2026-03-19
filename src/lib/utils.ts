import { customAlphabet } from "nanoid";
import { clsx, type ClassValue } from "clsx";

// ─── Classnames ──────────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ─── Slug Generation ─────────────────────────────────────────────────────────

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export function generateSlug(title?: string): string {
  const base = title
    ? title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30)
    : "form";
  return `${base}-${nanoid()}`;
}

// ─── ID Generation ───────────────────────────────────────────────────────────

const fieldId = customAlphabet("abcdefghijklmnopqrstuvwxyz", 7);

export function generateFieldId(): string {
  return `f_${fieldId()}`;
}

// ─── Date Formatting ─────────────────────────────────────────────────────────

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  const intervals = [
    { label: "y", seconds: 31536000 },
    { label: "mo", seconds: 2592000 },
    { label: "d", seconds: 86400 },
    { label: "h", seconds: 3600 },
    { label: "m", seconds: 60 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count > 0) return `${count}${interval.label} ago`;
  }
  return "just now";
}

// ─── Analytics Helpers ───────────────────────────────────────────────────────

export function calculateNPS(scores: number[]): number {
  if (scores.length === 0) return 0;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// ─── Submission Validation ───────────────────────────────────────────────────

export function validateSubmission(
  fields: Array<{ id: string; type: string; required: boolean; options: string[] }>,
  data: Record<string, unknown>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = data[field.id];

    if (field.required) {
      if (value === undefined || value === null || value === "") {
        errors[field.id] = "This field is required";
        continue;
      }
      if (Array.isArray(value) && value.length === 0) {
        errors[field.id] = "Please select at least one option";
        continue;
      }
    }

    if (value !== undefined && value !== null && value !== "") {
      switch (field.type) {
        case "email":
          if (typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors[field.id] = "Invalid email address";
          }
          break;
        case "number":
          if (isNaN(Number(value))) {
            errors[field.id] = "Must be a number";
          }
          break;
        case "url":
          try {
            new URL(value as string);
          } catch {
            errors[field.id] = "Invalid URL";
          }
          break;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
