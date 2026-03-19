// ─── Field Types ─────────────────────────────────────────────────────────────

export const FIELD_TYPES = [
  { type: "short_text", label: "Short Text", icon: "Type", desc: "Single line input" },
  { type: "long_text", label: "Long Text", icon: "AlignLeft", desc: "Multi-line textarea" },
  { type: "email", label: "Email", icon: "Mail", desc: "Email address" },
  { type: "number", label: "Number", icon: "Hash", desc: "Numeric input" },
  { type: "phone", label: "Phone", icon: "Phone", desc: "Phone number" },
  { type: "url", label: "URL", icon: "Link", desc: "Web address" },
  { type: "select", label: "Dropdown", icon: "ChevronDown", desc: "Select one option" },
  { type: "multi_select", label: "Multi Select", icon: "List", desc: "Choose multiple" },
  { type: "rating", label: "Rating", icon: "Star", desc: "Star rating 1-5" },
  { type: "scale", label: "Scale", icon: "SlidersHorizontal", desc: "Opinion scale 1-10" },
  { type: "yes_no", label: "Yes / No", icon: "ToggleLeft", desc: "Binary choice" },
  { type: "date", label: "Date", icon: "Calendar", desc: "Date picker" },
  { type: "file", label: "File Upload", icon: "Upload", desc: "File attachment" },
] as const;

export type FieldType = (typeof FIELD_TYPES)[number]["type"];

// ─── Form ────────────────────────────────────────────────────────────────────

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  options: string[];
  validation: Record<string, unknown>;
  position: number;
  settings: Record<string, unknown>;
}

export interface Form {
  id: string;
  slug: string;
  title: string;
  description?: string;
  theme: ThemeKey;
  status: "draft" | "published" | "closed";
  settings: FormSettings;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  _count?: { submissions: number };
}

export interface FormSettings {
  showProgressBar: boolean;
  showQuestionNumbers: boolean;
  submitButtonText: string;
  successTitle: string;
  successMessage: string;
  redirectUrl?: string;
  notifyEmail?: string;
  webhookUrl?: string;
  rtl: boolean;
}

export const DEFAULT_FORM_SETTINGS: FormSettings = {
  showProgressBar: true,
  showQuestionNumbers: true,
  submitButtonText: "Submit",
  successTitle: "Thank you!",
  successMessage: "Your response has been recorded.",
  rtl: false,
};

// ─── Submissions ─────────────────────────────────────────────────────────────

export interface Submission {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  metadata: SubmissionMetadata;
  status: "complete" | "partial";
  createdAt: string;
  completedAt?: string;
}

export interface SubmissionMetadata {
  userAgent?: string;
  country?: string;
  duration?: number; // seconds
}

// ─── Themes ──────────────────────────────────────────────────────────────────

export interface Theme {
  name: string;
  bg: string;
  card: string;
  accent: string;
  text: string;
  muted: string;
  border: string;
}

export const THEMES: Record<string, Theme> = {
  midnight: {
    name: "Midnight",
    bg: "#0c0c14",
    card: "#16162a",
    accent: "#d4a054",
    text: "#e8e4dc",
    muted: "#6b6878",
    border: "#232338",
  },
  ocean: {
    name: "Ocean",
    bg: "#0a1628",
    card: "#0f2035",
    accent: "#38bdf8",
    text: "#e0eaf5",
    muted: "#5a7a9a",
    border: "#1a3050",
  },
  forest: {
    name: "Forest",
    bg: "#0a120c",
    card: "#122218",
    accent: "#4ade80",
    text: "#d8ead8",
    muted: "#5a8a6a",
    border: "#1a3a22",
  },
  ember: {
    name: "Ember",
    bg: "#140a0a",
    card: "#221212",
    accent: "#f87171",
    text: "#f0dada",
    muted: "#9a5a5a",
    border: "#3a1a1a",
  },
  paper: {
    name: "Paper",
    bg: "#f5f0e8",
    card: "#ffffff",
    accent: "#c45d3e",
    text: "#2a2520",
    muted: "#8a8078",
    border: "#e0dcd4",
  },
  arctic: {
    name: "Arctic",
    bg: "#f8fafc",
    card: "#ffffff",
    accent: "#3b82f6",
    text: "#1e293b",
    muted: "#94a3b8",
    border: "#e2e8f0",
  },
};

export type ThemeKey = keyof typeof THEMES;

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface FormAnalytics {
  totalSubmissions: number;
  completionRate: number;
  avgDuration: number;
  submissionsToday: number;
  submissionsThisWeek: number;
  dailyCounts: { date: string; count: number }[];
  fieldStats: Record<string, FieldAnalytics>;
}

export interface FieldAnalytics {
  fieldId: string;
  label: string;
  type: FieldType;
  responseCount: number;
  distribution?: Record<string, number>; // for select, rating, etc.
  average?: number; // for number, rating, scale
}

// ─── AI ──────────────────────────────────────────────────────────────────────

export interface AIGenerateRequest {
  prompt: string;
  language?: string;
}

export interface AIGenerateResponse {
  title: string;
  description: string;
  fields: Omit<FormField, "id" | "position">[];
}
