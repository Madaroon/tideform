"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Theme } from "@/lib/types";
import { getVisibleFields } from "@/lib/fieldVisibility";
import FileUploadInput from "@/components/uploads/FileUploadInput";

interface FormField {
  id: string;
  type: string;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  options: string[];
  settings?: Record<string, unknown>;
}

interface FormData {
  id: string;
  slug: string;
  title: string;
  description?: string;
  theme: string;
  settings: Record<string, any>;
  fields: FormField[];
}

interface Props {
  form: FormData;
  theme: Theme;
  showBranding?: boolean;
  variant?: "default" | "embed";
}

export default function FormRenderer({
  form,
  theme,
  showBranding = true,
  variant = "default",
}: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startTime = useRef(Date.now());

  const visibleFields = getVisibleFields(form.fields, answers);

  // Clamp step when visibility rules change.
  useEffect(() => {
    if (visibleFields.length === 0) {
      if (step !== 0) setStep(0);
      return;
    }
    if (step > visibleFields.length - 1) setStep(visibleFields.length - 1);
  }, [visibleFields.length, step]);

  const field = visibleFields[step];
  const progress =
    visibleFields.length > 0 ? ((step + 1) / visibleFields.length) * 100 : 0;

  const setAnswer = useCallback((value: any) => {
    if (!field) return;
    setAnswers((prev) => ({ ...prev, [field.id]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field.id];
      return next;
    });
  }, [field]);

  const validate = useCallback(() => {
    if (!field) return true;
    if (field.required) {
      const val = answers[field.id];
      if (val === undefined || val === null || val === "") {
        setErrors((prev) => ({ ...prev, [field.id]: "This field is required" }));
        return false;
      }
      if (Array.isArray(val) && val.length === 0) {
        setErrors((prev) => ({ ...prev, [field.id]: "Please select at least one option" }));
        return false;
      }
    }
    if (field.type === "email" && answers[field.id]) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers[field.id])) {
        setErrors((prev) => ({ ...prev, [field.id]: "Please enter a valid email" }));
        return false;
      }
    }
    return true;
  }, [field, answers]);

  const goNext = useCallback(() => {
    if (!validate()) return;
    if (step < visibleFields.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  }, [step, visibleFields.length, validate]);

  const goBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey) {
        if (field?.type !== "long_text") {
          e.preventDefault();
          goNext();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, field?.type]);

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formSlug: form.slug,
          data: answers,
          metadata: {
            userAgent: navigator.userAgent,
            duration: Math.round((Date.now() - startTime.current) / 1000),
          },
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit");
      }
    } catch {
      alert("Network error. Please try again.");
    }

    setSubmitting(false);
  }

  const s = {
    bg: theme.bg,
    card: theme.card,
    accent: theme.accent,
    text: theme.text,
    muted: theme.muted,
    border: theme.border,
    accentDim: theme.accent + "20",
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
          {form.settings.successTitle || "Thank you!"}
        </h2>
        <p style={{ color: s.muted, fontSize: 15 }}>
          {form.settings.successMessage || "Your response has been recorded."}
        </p>
      </div>
    );
  }

  if (!field) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: s.muted }}>
        {visibleFields.length === 0
          ? "No questions match the selected conditions."
          : "This form has no questions yet."}
      </div>
    );
  }

  const isEmbed = variant === "embed";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: isEmbed ? "100%" : 480,
        margin: isEmbed ? 0 : "0 auto",
        minHeight: isEmbed ? "auto" : "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ padding: "32px 32px 0" }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 600,
          marginBottom: 4, letterSpacing: -0.3,
        }}>
          {form.title}
        </h1>
        {form.description && (
          <p style={{ fontSize: 14, color: s.muted, marginBottom: 12 }}>{form.description}</p>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ height: 3, background: s.border, margin: "0 32px", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", background: s.accent, borderRadius: 2,
          width: `${progress}%`, transition: "width 0.4s ease",
        }} />
      </div>

      {/* Question */}
      <div style={{ flex: 1, padding: 32, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, color: s.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          Question {step + 1} of {visibleFields.length}
        </div>
        <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 6, lineHeight: 1.4 }}>
          {field.label || `Question ${step + 1}`}
          {field.required && <span style={{ color: "#f87171", marginLeft: 4 }}>*</span>}
        </div>
        {field.description && (
          <div style={{ fontSize: 13, color: s.muted, marginBottom: 16 }}>{field.description}</div>
        )}

        <div style={{ marginTop: 8 }}>
          <FieldInput field={field} value={answers[field.id]} onChange={setAnswer} theme={s} />
        </div>

        {errors[field.id] && (
          <div style={{ fontSize: 12, color: "#f87171", marginTop: 8 }}>{errors[field.id]}</div>
        )}
      </div>

      {/* Footer Nav */}
      <div style={{
        padding: "16px 32px", display: "flex", justifyContent: "space-between",
        alignItems: "center", borderTop: `1px solid ${s.border}`,
      }}>
        {step > 0 ? (
          <button onClick={goBack} style={{
            padding: "10px 20px", border: `1px solid ${s.border}`, borderRadius: 8,
            background: "transparent", color: s.muted, fontSize: 13, fontWeight: 600,
            cursor: "pointer",
          }}>
            ← Back
          </button>
        ) : <div />}
        <button onClick={goNext} disabled={submitting} style={{
          padding: "10px 24px", border: "none", borderRadius: 8,
          background: s.accent, color: s.bg, fontSize: 13, fontWeight: 600,
          cursor: "pointer", opacity: submitting ? 0.6 : 1,
        }}>
          {submitting ? "Submitting..." : step === visibleFields.length - 1 ? "Submit" : "Next →"}
        </button>
      </div>

      {/* Branding */}
      {showBranding && (
        <div style={{ textAlign: "center", padding: "12px 0 24px", fontSize: 11, color: s.muted }}>
          Powered by <a href="https://github.com/tideform/tideform" style={{ color: s.accent, textDecoration: "none" }}>Tideform</a>
        </div>
      )}
    </div>
  );
}

// ─── Field Input Renderer ────────────────────────────────────────────────────

function FieldInput({ field, value, onChange, theme: s }: {
  field: FormField; value: any; onChange: (v: any) => void; theme: any;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 0", border: "none",
    borderBottom: `2px solid ${s.border}`, background: "none",
    color: s.text, fontSize: 16, outline: "none", fontFamily: "inherit",
  };

  switch (field.type) {
    case "short_text":
    case "email":
    case "phone":
    case "url":
    case "number":
      return (
        <input
          type={field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "url" ? "url" : field.type === "phone" ? "tel" : "text"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Type your answer..."}
          autoFocus
          style={inputStyle}
        />
      );

    case "long_text":
      return (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Type your answer..."}
          autoFocus
          rows={4}
          style={{
            ...inputStyle, borderBottom: "none", border: `1px solid ${s.border}`,
            borderRadius: 8, padding: 12, resize: "vertical",
          }}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, colorScheme: "dark" }}
        />
      );

    case "select":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {field.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => onChange(opt)}
              style={{
                padding: "12px 16px", border: `1px solid ${value === opt ? s.accent : s.border}`,
                borderRadius: 8, cursor: "pointer", fontSize: 14, textAlign: "left",
                background: value === opt ? s.accentDim : "transparent",
                color: s.text, display: "flex", alignItems: "center", gap: 10,
                transition: "all 0.15s",
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
                border: `1px solid ${value === opt ? s.accent : s.muted}`,
                fontSize: 10, fontWeight: 600, color: value === opt ? s.accent : s.muted, flexShrink: 0,
              }}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          ))}
        </div>
      );

    case "multi_select":
      const selected = value || [];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {field.options.map((opt, i) => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={i}
                onClick={() => onChange(isSelected ? selected.filter((s: string) => s !== opt) : [...selected, opt])}
                style={{
                  padding: "12px 16px", border: `1px solid ${isSelected ? s.accent : s.border}`,
                  borderRadius: 8, cursor: "pointer", fontSize: 14, textAlign: "left",
                  background: isSelected ? s.accentDim : "transparent",
                  color: s.text, display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px solid ${isSelected ? s.accent : s.muted}`,
                  fontSize: 12, color: isSelected ? s.accent : s.muted,
                }}>
                  {isSelected ? "✓" : ""}
                </span>
                {opt}
              </button>
            );
          })}
          <p style={{ fontSize: 11, color: s.muted }}>Select all that apply</p>
        </div>
      );

    case "rating":
      return (
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onChange(n)}
              style={{
                width: 48, height: 48, borderRadius: 8,
                border: `1px solid ${(value || 0) >= n ? s.accent : s.border}`,
                background: (value || 0) >= n ? s.accentDim : "transparent",
                color: (value || 0) >= n ? s.accent : s.muted,
                fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ★
            </button>
          ))}
        </div>
      );

    case "scale":
      return (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => onChange(n)}
              style={{
                width: 38, height: 38, borderRadius: 8,
                border: `1px solid ${value === n ? s.accent : s.border}`,
                background: value === n ? s.accentDim : "transparent",
                color: value === n ? s.accent : s.text,
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {n}
            </button>
          ))}
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between", fontSize: 11, color: s.muted, marginTop: 4 }}>
            <span>Not at all</span>
            <span>Extremely</span>
          </div>
        </div>
      );

    case "yes_no":
      return (
        <div style={{ display: "flex", gap: 12 }}>
          {["Yes", "No"].map((v) => (
            <button
              key={v}
              onClick={() => onChange(v)}
              style={{
                flex: 1, padding: 16, borderRadius: 8,
                border: `1px solid ${value === v ? s.accent : s.border}`,
                background: value === v ? s.accentDim : "transparent",
                color: value === v ? s.accent : s.text,
                fontSize: 15, fontWeight: 500, cursor: "pointer",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      );

    case "file":
      return (
        <FileUploadInput
          value={value || null}
          onChange={(v) => onChange(v)}
          theme={s}
        />
      );

    default:
      return (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer..."
          autoFocus
          style={inputStyle}
        />
      );
  }
}
