"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FIELD_TYPES, THEMES, DEFAULT_FORM_SETTINGS } from "@/lib/types";
import type { FormField, ThemeKey } from "@/lib/types";
import { generateFieldId } from "@/lib/utils";
import { getFieldVisibilityRule, getVisibleFields } from "@/lib/fieldVisibility";

export default function BuilderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const formId = params.formId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("Untitled Form");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [theme, setTheme] = useState<ThemeKey>("midnight");
  const [settings, setSettings] = useState(DEFAULT_FORM_SETTINGS);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState("draft");
  const [formSlug, setFormSlug] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"fields" | "ai">("fields");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [view, setView] = useState<"build" | "preview" | "responses">("build");
  const [previewStep, setPreviewStep] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [previewDone, setPreviewDone] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Load form data
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/forms/${formId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.form) {
          setTitle(d.form.title);
          setDescription(d.form.description || "");
          setTheme(d.form.theme || "midnight");
          setFormStatus(d.form.status);
          setFormSlug(d.form.slug);
          setSettings({ ...DEFAULT_FORM_SETTINGS, ...d.form.settings });
          setFields(
            d.form.fields.map((f: any, i: number) => ({
              id: f.id,
              type: f.type,
              label: f.label,
              description: f.description || "",
              placeholder: f.placeholder || "",
              required: f.required,
              options: f.options || [],
              validation: f.validation || {},
              position: i,
              settings: f.settings || {},
            }))
          );
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.push("/dashboard");
      });
  }, [formId, status, router]);

  // Auto-save
  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          theme,
          settings,
          fields: fields.map((f, i) => ({ ...f, position: i })),
        }),
      });
      setLastSaved(new Date());
    } catch (e) {
      console.error("Save failed:", e);
    }
    setSaving(false);
  }, [formId, title, description, theme, settings, fields]);

  // Debounced auto-save
  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(save, 2000);
    return () => clearTimeout(timeout);
  }, [title, description, theme, fields, settings, save, loading]);

  // Field operations
  const addField = useCallback((type: string) => {
    const newField: FormField = {
      id: generateFieldId(),
      type: type as any,
      label: "",
      description: "",
      placeholder: "",
      required: false,
      options: type === "select" || type === "multi_select" ? ["Option 1", "Option 2", "Option 3"] : [],
      validation: {},
      position: fields.length,
      settings: {},
    };
    setFields((prev) => [...prev, newField]);
    setSelectedField(newField.id);
  }, [fields.length]);

  const updateField = useCallback((id: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedField === id) setSelectedField(null);
  }, [selectedField]);

  const moveField = useCallback((id: string, dir: -1 | 1) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if ((dir === -1 && idx === 0) || (dir === 1 && idx === prev.length - 1)) return prev;
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next;
    });
  }, []);

  // AI generation
  const generateWithAI = useCallback(async (prompt: string) => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.result) {
        const newFields = data.result.fields.map((f: any, i: number) => ({
          ...f,
          id: generateFieldId(),
          position: i,
          options: f.options || [],
          validation: f.validation || {},
          settings: f.settings || {},
        }));
        setFields(newFields);
        setTitle(data.result.title || title);
        setDescription(data.result.description || "");
        setSidebarTab("fields");
      }
    } catch {
      alert("AI generation failed. Try again.");
    }
    setAiLoading(false);
  }, [title]);

  // Publish
  const publishForm = useCallback(async () => {
    await save();
    const res = await fetch(`/api/forms/${formId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: formStatus === "published" ? "draft" : "publish" }),
    });
    const data = await res.json();
    if (data.form) setFormStatus(data.form.status);
  }, [formId, formStatus, save]);

  // Reset preview
  useEffect(() => {
    setPreviewStep(0);
    setPreviewAnswers({});
    setPreviewDone(false);
  }, [view, fields]);

  const t = THEMES[theme] || THEMES.midnight;

  const visiblePreviewFields = getVisibleFields(fields, previewAnswers);

  // Clamp the step when conditions change.
  useEffect(() => {
    if (view !== "preview") return;
    if (visiblePreviewFields.length === 0) {
      if (previewStep !== 0) setPreviewStep(0);
      return;
    }
    if (previewStep > visiblePreviewFields.length - 1) {
      setPreviewStep(visiblePreviewFields.length - 1);
    }
  }, [view, visiblePreviewFields.length, previewStep]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center">
        <div className="text-[var(--text-muted)] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: t.bg, color: t.text }}>
      {/* ─── Top Bar ─── */}
      <div className="h-14 flex items-center justify-between px-5 border-b flex-shrink-0" style={{ borderColor: t.border }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-md flex items-center justify-center font-display font-bold text-xs" style={{ background: t.accent, color: t.bg }}>T</div>
            <span className="font-display text-base font-semibold tracking-tight">tideform</span>
          </Link>
          <span style={{ color: t.muted }}>/</span>
          <span className="text-sm font-medium truncate max-w-[200px]">{title || "Untitled"}</span>
        </div>

        <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: t.card }}>
          {(["build", "preview", "responses"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-4 py-1.5 rounded-md text-xs font-medium transition-all capitalize"
              style={{
                background: view === v ? t.accent + "20" : "transparent",
                color: view === v ? t.accent : t.muted,
              }}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-[10px]" style={{ color: t.muted }}>
              {saving ? "Saving..." : `Saved ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </span>
          )}
          <div className="flex gap-1.5">
            {Object.entries(THEMES).map(([key, th]) => (
              <button
                key={key}
                onClick={() => setTheme(key as ThemeKey)}
                className="w-4 h-4 rounded-full transition-transform hover:scale-125"
                style={{
                  background: th.accent,
                  border: theme === key ? `2px solid ${t.text}` : "2px solid transparent",
                }}
                title={th.name}
              />
            ))}
          </div>
          {formStatus === "published" && (
            <a
              href={`/f/${formSlug}`}
              target="_blank"
              className="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:opacity-80"
              style={{ borderColor: t.border, color: t.muted }}
            >
              View Live ↗
            </a>
          )}
          <button
            onClick={publishForm}
            className="px-4 py-1.5 rounded-md text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: t.accent, color: t.bg }}
          >
            {formStatus === "published" ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {/* ─── Build View ─── */}
      {view === "build" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-72 border-r flex flex-col flex-shrink-0" style={{ borderColor: t.border }}>
            <div className="flex border-b" style={{ borderColor: t.border }}>
              {(["fields", "ai"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className="flex-1 py-2.5 text-xs font-medium border-b-2 transition-all"
                  style={{
                    color: sidebarTab === tab ? t.accent : t.muted,
                    borderBottomColor: sidebarTab === tab ? t.accent : "transparent",
                  }}
                >
                  {tab === "ai" ? "✦ AI Generate" : "Fields"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {sidebarTab === "fields" ? (
                <div className="space-y-1.5">
                  {FIELD_TYPES.map((ft) => (
                    <button
                      key={ft.type}
                      onClick={() => addField(ft.type)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all hover:translate-x-0.5"
                      style={{ borderColor: t.border, background: t.card }}
                    >
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-semibold flex-shrink-0"
                        style={{ background: t.accent + "20", color: t.accent }}
                      >
                        {ft.icon === "Type" ? "T" : ft.icon === "AlignLeft" ? "¶" : ft.icon === "Mail" ? "@" : ft.icon === "Hash" ? "#" : ft.icon === "Phone" ? "☏" : ft.icon === "Link" ? "🔗" : ft.icon === "ChevronDown" ? "▾" : ft.icon === "List" ? "☰" : ft.icon === "Star" ? "★" : ft.icon === "SlidersHorizontal" ? "◔" : ft.icon === "ToggleLeft" ? "◑" : ft.icon === "Calendar" ? "◷" : ft.icon === "Upload" ? "↑" : "·"}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-medium">{ft.label}</div>
                        <div className="text-[10px]" style={{ color: t.muted }}>{ft.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded-lg border text-sm outline-none resize-vertical"
                    style={{ borderColor: t.border, background: t.card, color: t.text }}
                    placeholder={"Describe the form you need...\n\ne.g. 'Customer feedback survey for a SaaS product'"}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    disabled={aiLoading}
                  />
                  <p className="text-[11px]" style={{ color: t.muted }}>
                    AI will generate fields, labels, and validation from your description.
                  </p>
                  {aiLoading ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs" style={{ color: t.accent }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: t.accent }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: t.accent, animationDelay: "0.2s" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: t.accent, animationDelay: "0.4s" }} />
                      Generating...
                    </div>
                  ) : (
                    <button
                      onClick={() => aiPrompt.trim() && generateWithAI(aiPrompt)}
                      className="w-full py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
                      style={{ background: t.accent, color: t.bg }}
                    >
                      ✦ Generate Form
                    </button>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["Customer feedback", "Job application", "Event registration", "Product survey", "Contact form", "Waitlist"].map((s) => (
                      <button
                        key={s}
                        onClick={() => { setAiPrompt(s); generateWithAI(s); }}
                        className="px-2.5 py-1 rounded-full text-[10px] border transition-all hover:border-current"
                        style={{ borderColor: t.border, color: t.muted }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-y-auto p-10">
            <div className="max-w-xl mx-auto">
              <input
                className="w-full font-display text-3xl font-semibold tracking-tight bg-transparent border-none outline-none mb-2"
                style={{ color: t.text }}
                placeholder="Untitled Form"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <input
                className="w-full text-sm bg-transparent border-none outline-none mb-8"
                style={{ color: t.muted }}
                placeholder="Add a description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {fields.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-xl" style={{ borderColor: t.border, color: t.muted }}>
                  <div className="text-4xl opacity-20 mb-3">◇</div>
                  <p className="text-sm mb-1">No fields yet</p>
                  <p className="text-xs opacity-60">Add fields from the sidebar or use AI to generate a form</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, i) => {
                    const ft = FIELD_TYPES.find((f) => f.type === field.type);
                    const isSelected = selectedField === field.id;
                    const hasOptions = field.type === "select" || field.type === "multi_select";

                    return (
                      <div
                        key={field.id}
                        onClick={() => setSelectedField(isSelected ? null : field.id)}
                        className="p-5 rounded-xl border cursor-default transition-all animate-field-in"
                        style={{
                          borderColor: isSelected ? t.accent : t.border,
                          background: t.card,
                          boxShadow: isSelected ? `0 0 0 1px ${t.accent}` : "none",
                        }}
                      >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: t.accent }}>
                            <span>{ft?.label}</span>
                            {field.required && <span style={{ color: "#f87171" }}>Required</span>}
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: isSelected ? 1 : undefined }}>
                            <button onClick={(e) => { e.stopPropagation(); moveField(field.id, -1); }} disabled={i === 0} className="w-7 h-7 rounded-md flex items-center justify-center text-xs hover:opacity-80 transition" style={{ color: t.muted, background: i === 0 ? "transparent" : t.accent + "15" }}>↑</button>
                            <button onClick={(e) => { e.stopPropagation(); moveField(field.id, 1); }} disabled={i === fields.length - 1} className="w-7 h-7 rounded-md flex items-center justify-center text-xs hover:opacity-80 transition" style={{ color: t.muted, background: i === fields.length - 1 ? "transparent" : t.accent + "15" }}>↓</button>
                            <button onClick={(e) => { e.stopPropagation(); removeField(field.id); }} className="w-7 h-7 rounded-md flex items-center justify-center text-xs hover:opacity-80 transition" style={{ color: "#f87171", background: "#f8717115" }}>×</button>
                          </div>
                        </div>

                        {/* Label */}
                        <input
                          className="w-full text-sm font-medium bg-transparent border-none outline-none"
                          style={{ color: t.text }}
                          placeholder={`Question ${i + 1}`}
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                        />

                        {/* Type-specific preview */}
                        {["short_text", "long_text", "email", "number", "phone", "url", "date"].includes(field.type) && (
                          <div className="mt-2 py-2 border-b text-sm" style={{ borderColor: t.border, color: t.muted }}>
                            {field.type === "email" ? "name@example.com" : field.type === "number" ? "0" : field.type === "date" ? "MM/DD/YYYY" : field.type === "phone" ? "+1 (555) 000-0000" : field.type === "url" ? "https://" : "Type answer here..."}
                          </div>
                        )}

                        {field.type === "rating" && (
                          <div className="flex gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map((s) => <span key={s} className="text-xl" style={{ color: t.border }}>★</span>)}
                          </div>
                        )}

                        {field.type === "scale" && (
                          <div className="flex gap-1 mt-2">
                            {[...Array(10)].map((_, i) => (
                              <div key={i} className="w-7 h-7 rounded-md border flex items-center justify-center text-[10px]" style={{ borderColor: t.border, color: t.muted }}>{i + 1}</div>
                            ))}
                          </div>
                        )}

                        {field.type === "yes_no" && (
                          <div className="flex gap-2 mt-2">
                            {["Yes", "No"].map((o) => (
                              <div key={o} className="px-6 py-2 rounded-md border text-xs" style={{ borderColor: t.border, color: t.muted }}>{o}</div>
                            ))}
                          </div>
                        )}

                        {/* Options editor */}
                        {hasOptions && isSelected && (
                          <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                            {field.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <input
                                  className="flex-1 px-2.5 py-1.5 rounded-md border text-xs outline-none"
                                  style={{ borderColor: t.border, background: t.bg, color: t.text }}
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...field.options];
                                    newOpts[oi] = e.target.value;
                                    updateField(field.id, { options: newOpts });
                                  }}
                                />
                                <button
                                  onClick={() => updateField(field.id, { options: field.options.filter((_, i) => i !== oi) })}
                                  className="text-sm" style={{ color: t.muted }}
                                >×</button>
                              </div>
                            ))}
                            <button
                              onClick={() => updateField(field.id, { options: [...field.options, `Option ${field.options.length + 1}`] })}
                              className="text-[11px] font-medium" style={{ color: t.accent }}
                            >
                              + Add option
                            </button>
                          </div>
                        )}

                        {/* Required toggle */}
                        {isSelected && (
                          <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => updateField(field.id, { required: !field.required })}
                              className="w-8 h-[18px] rounded-full relative transition-colors"
                              style={{ background: field.required ? t.accent : t.border }}
                            >
                              <div
                                className="w-3.5 h-3.5 rounded-full bg-white absolute top-[2px] transition-transform"
                                style={{ left: 2, transform: field.required ? "translateX(14px)" : "translateX(0)" }}
                              />
                            </button>
                            <span className="text-[11px]" style={{ color: t.muted }}>Required</span>
                          </div>
                        )}

                        {/* Conditional visibility */}
                        {isSelected && (() => {
                          const rule = getFieldVisibilityRule(field.settings as any);
                          const enabled = !!rule;
                          const otherFields = fields.filter((f) => f.id !== field.id);
                          const dependsField = rule ? fields.find((f) => f.id === rule.fieldId) : null;

                          const defaultValueFor = (dep: FormField | undefined | null) => {
                            if (!dep) return "";
                            switch (dep.type) {
                              case "yes_no":
                                return "Yes";
                              case "rating":
                                return "5";
                              case "scale":
                                return "10";
                              case "select":
                              case "multi_select":
                                return dep.options?.[0] ?? "";
                              default:
                                return "";
                            }
                          };

                          const valueEditor = (() => {
                            const expected = (rule?.value ?? "") as any;
                            if (!dependsField) {
                              return (
                                <input
                                  className="w-full px-2.5 py-1.5 rounded-md border text-xs outline-none"
                                  style={{ borderColor: t.border, background: t.bg, color: t.text }}
                                  value={String(expected)}
                                  onChange={(e) => {
                                    const nextSettings = { ...(field.settings || {}) } as any;
                                    nextSettings.visibility = {
                                      fieldId: rule?.fieldId ?? field.id,
                                      operator: "equals",
                                      value: e.target.value,
                                    };
                                    updateField(field.id, { settings: nextSettings });
                                  }}
                                />
                              );
                            }

                            if (dependsField.type === "select" || dependsField.type === "multi_select") {
                              return (
                                <select
                                  className="w-full px-2.5 py-1.5 rounded-md border text-xs outline-none"
                                  style={{ borderColor: t.border, background: t.bg, color: t.text }}
                                  value={String(expected)}
                                  onChange={(e) => {
                                    const nextSettings = { ...(field.settings || {}) } as any;
                                    nextSettings.visibility = {
                                      fieldId: dependsField.id,
                                      operator: "equals",
                                      value: e.target.value,
                                    };
                                    updateField(field.id, { settings: nextSettings });
                                  }}
                                >
                                  {dependsField.options.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              );
                            }

                            if (dependsField.type === "yes_no") {
                              return (
                                <select
                                  className="w-full px-2.5 py-1.5 rounded-md border text-xs outline-none"
                                  style={{ borderColor: t.border, background: t.bg, color: t.text }}
                                  value={String(expected)}
                                  onChange={(e) => {
                                    const nextSettings = { ...(field.settings || {}) } as any;
                                    nextSettings.visibility = {
                                      fieldId: dependsField.id,
                                      operator: "equals",
                                      value: e.target.value,
                                    };
                                    updateField(field.id, { settings: nextSettings });
                                  }}
                                >
                                  {["Yes", "No"].map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              );
                            }

                            if (dependsField.type === "rating") {
                              return (
                                <select
                                  className="w-full px-2.5 py-1.5 rounded-md border text-xs outline-none"
                                  style={{ borderColor: t.border, background: t.bg, color: t.text }}
                                  value={String(expected)}
                                  onChange={(e) => {
                                    const nextSettings = { ...(field.settings || {}) } as any;
                                    nextSettings.visibility = {
                                      fieldId: dependsField.id,
                                      operator: "equals",
                                      value: e.target.value,
                                    };
                                    updateField(field.id, { settings: nextSettings });
                                  }}
                                >
                                  {["1", "2", "3", "4", "5"].map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              );
                            }

                            if (dependsField.type === "scale") {
                              return (
                                <select
                                  className="w-full px-2.5 py-1.5 rounded-md border text-xs outline-none"
                                  style={{ borderColor: t.border, background: t.bg, color: t.text }}
                                  value={String(expected)}
                                  onChange={(e) => {
                                    const nextSettings = { ...(field.settings || {}) } as any;
                                    nextSettings.visibility = {
                                      fieldId: dependsField.id,
                                      operator: "equals",
                                      value: e.target.value,
                                    };
                                    updateField(field.id, { settings: nextSettings });
                                  }}
                                >
                                  {Array.from({ length: 10 }, (_, idx) => String(idx + 1)).map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              );
                            }

                            if (dependsField.type === "date") {
                              return (
                                <input
                                  className="w-full px-2.5 py-1.5 rounded-md border text-xs outline-none"
                                  style={{ borderColor: t.border, background: t.bg, color: t.text }}
                                  type="date"
                                  value={String(expected)}
                                  onChange={(e) => {
                                    const nextSettings = { ...(field.settings || {}) } as any;
                                    nextSettings.visibility = {
                                      fieldId: dependsField.id,
                                      operator: "equals",
                                      value: e.target.value,
                                    };
                                    updateField(field.id, { settings: nextSettings });
                                  }}
                                />
                              );
                            }

                            if (dependsField.type === "number") {
                              return (
                                <input
                                  className="w-full px-2.5 py-1.5 rounded-md border text-xs outline-none"
                                  style={{ borderColor: t.border, background: t.bg, color: t.text }}
                                  type="number"
                                  value={String(expected)}
                                  onChange={(e) => {
                                    const nextSettings = { ...(field.settings || {}) } as any;
                                    nextSettings.visibility = {
                                      fieldId: dependsField.id,
                                      operator: "equals",
                                      value: e.target.value,
                                    };
                                    updateField(field.id, { settings: nextSettings });
                                  }}
                                />
                              );
                            }

                            return (
                              <input
                                className="w-full px-2.5 py-1.5 rounded-md border text-xs outline-none"
                                style={{ borderColor: t.border, background: t.bg, color: t.text }}
                                value={String(expected)}
                                onChange={(e) => {
                                  const nextSettings = { ...(field.settings || {}) } as any;
                                  nextSettings.visibility = {
                                    fieldId: dependsField.id,
                                    operator: "equals",
                                    value: e.target.value,
                                  };
                                  updateField(field.id, { settings: nextSettings });
                                }}
                              />
                            );
                          })();

                          return (
                            <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-[11px] font-medium" style={{ color: t.muted }}>
                                    Conditional visibility
                                  </div>
                                  <div className="text-[10px]" style={{ color: t.muted }}>
                                    Show this field only when a rule matches
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    if (enabled) {
                                      const nextSettings = { ...(field.settings || {}) } as any;
                                      delete nextSettings.visibility;
                                      updateField(field.id, { settings: nextSettings });
                                      return;
                                    }
                                    const firstOther = otherFields[0];
                                    if (!firstOther) return;
                                    updateField(field.id, {
                                      settings: {
                                        ...(field.settings || {}),
                                        visibility: {
                                          fieldId: firstOther.id,
                                          operator: "equals",
                                          value: defaultValueFor(firstOther),
                                        },
                                      },
                                    });
                                  }}
                                  className="w-8 h-[18px] rounded-full relative transition-colors"
                                  style={{ background: enabled ? t.accent : t.border }}
                                  title={enabled ? "Disable condition" : "Enable condition"}
                                >
                                  <div
                                    className="w-3.5 h-3.5 rounded-full bg-white absolute top-[2px] transition-transform"
                                    style={{ left: 2, transform: enabled ? "translateX(14px)" : "translateX(0)" }}
                                  />
                                </button>
                              </div>

                              {enabled && (
                                <>
                                  <div>
                                    <div className="text-[10px] font-semibold mb-1" style={{ color: t.muted }}>
                                      Only show if field
                                    </div>
                                    <select
                                      className="w-full px-2.5 py-1.5 rounded-md border text-xs outline-none"
                                      style={{ borderColor: t.border, background: t.bg, color: t.text }}
                                      value={String(rule?.fieldId ?? "")}
                                      onChange={(e) => {
                                        const nextDependsId = e.target.value;
                                        const nextDepends = fields.find((f) => f.id === nextDependsId);
                                        updateField(field.id, {
                                          settings: {
                                            ...(field.settings || {}),
                                            visibility: {
                                              fieldId: nextDependsId,
                                              operator: "equals",
                                              value: defaultValueFor(nextDepends),
                                            },
                                          },
                                        });
                                      }}
                                    >
                                      {otherFields.map((dep) => (
                                        <option key={dep.id} value={dep.id}>
                                          {dep.label || dep.id}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <div className="text-[10px] font-semibold mb-1" style={{ color: t.muted }}>
                                      equals
                                    </div>
                                    {valueEditor}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Preview View ─── */}
      {view === "preview" && (
        <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ background: t.bg }}>
          <div className="w-[420px] max-h-[85vh] rounded-2xl border flex flex-col overflow-hidden" style={{ borderColor: t.border, background: t.card, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            {fields.length === 0 ? (
              <div className="p-10 text-center text-sm" style={{ color: t.muted }}>
                <p>No fields to preview.</p>
                <p className="text-xs mt-1 opacity-60">Add fields in the Build tab first.</p>
              </div>
            ) : previewDone ? (
              <div className="p-10 text-center">
                <div className="text-5xl mb-4">✓</div>
                <h2 className="font-display text-2xl font-semibold mb-2">{settings.successTitle}</h2>
                <p className="text-sm" style={{ color: t.muted }}>{settings.successMessage}</p>
                <button onClick={() => { setPreviewStep(0); setPreviewAnswers({}); setPreviewDone(false); }} className="mt-5 px-4 py-2 rounded-lg border text-xs font-medium" style={{ borderColor: t.border, color: t.muted }}>Preview again</button>
              </div>
            ) : visiblePreviewFields.length === 0 ? (
              <div className="p-10 text-center text-sm" style={{ color: t.muted }}>
                <p>No questions match the selected conditions.</p>
                <p className="text-xs mt-1 opacity-60">Edit the field conditions in the Build tab.</p>
              </div>
            ) : (
              <>
                <div className="pt-6 px-8">
                  <h2 className="font-display text-xl font-semibold tracking-tight mb-1">{title || "Untitled Form"}</h2>
                  {description && <p className="text-xs" style={{ color: t.muted }}>{description}</p>}
                </div>
                <div className="h-[3px] mx-8 mt-4 rounded-full overflow-hidden" style={{ background: t.border }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ background: t.accent, width: `${((previewStep + 1) / visiblePreviewFields.length) * 100}%` }} />
                </div>
                <div className="flex-1 p-8 flex flex-col justify-center">
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: t.accent }}>
                    Question {previewStep + 1} of {visiblePreviewFields.length}
                  </div>
                  <div className="text-lg font-medium mb-5 leading-snug">
                    {visiblePreviewFields[previewStep]?.label || `Question ${previewStep + 1}`}
                    {visiblePreviewFields[previewStep]?.required && <span style={{ color: "#f87171" }}> *</span>}
                  </div>
                  <PreviewInput
                    field={visiblePreviewFields[previewStep]}
                    value={previewAnswers[visiblePreviewFields[previewStep]?.id]}
                    onChange={(v) =>
                      setPreviewAnswers((p) => ({ ...p, [visiblePreviewFields[previewStep].id]: v }))
                    }
                    theme={t}
                  />
                </div>
                <div className="px-8 py-4 flex justify-between items-center border-t" style={{ borderColor: t.border }}>
                  {previewStep > 0 ? (
                    <button onClick={() => setPreviewStep((s) => s - 1)} className="px-5 py-2.5 rounded-lg border text-xs font-semibold" style={{ borderColor: t.border, color: t.muted }}>← Back</button>
                  ) : <div />}
                  <button
                    onClick={() => { if (previewStep < visiblePreviewFields.length - 1) setPreviewStep((s) => s + 1); else setPreviewDone(true); }}
                    className="px-5 py-2.5 rounded-lg text-xs font-semibold"
                    style={{ background: t.accent, color: t.bg }}
                  >
                    {previewStep === visiblePreviewFields.length - 1 ? "Submit" : "Next →"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Responses View ─── */}
      {view === "responses" && (
        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-2xl font-semibold mb-6">Responses</h2>
            <div className="text-center py-16 border border-dashed rounded-xl" style={{ borderColor: t.border, color: t.muted }}>
              <div className="text-4xl opacity-20 mb-3">📊</div>
              <p className="text-sm mb-1">
                {formStatus === "published" ? "Waiting for responses..." : "Publish your form to start collecting responses"}
              </p>
              <p className="text-xs opacity-60">
                {formStatus === "published" ? `Share your form: ${typeof window !== "undefined" ? window.location.origin : ""}/f/${formSlug}` : "Click the Publish button in the top bar"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Preview Input ───────────────────────────────────────────────────────────

function PreviewInput({ field, value, onChange, theme: t }: { field: FormField; value: any; onChange: (v: any) => void; theme: any }) {
  if (!field) return null;

  const inputBase: React.CSSProperties = {
    width: "100%", padding: "10px 0", border: "none", borderBottom: `2px solid ${t.border}`,
    background: "none", color: t.text, fontSize: 15, outline: "none", fontFamily: "inherit",
  };

  switch (field.type) {
    case "short_text": case "email": case "phone": case "url": case "number":
      return <input type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Type your answer..." autoFocus style={inputBase} />;
    case "long_text":
      return <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Type your answer..." rows={3} autoFocus style={{ ...inputBase, borderBottom: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: 12, resize: "vertical" }} />;
    case "date":
      return <input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} style={{ ...inputBase, colorScheme: "dark" }} />;
    case "select":
      return (
        <div className="space-y-2">
          {field.options.map((opt, i) => (
            <button key={i} onClick={() => onChange(opt)} className="w-full flex items-center gap-3 p-3 rounded-lg border text-sm text-left transition-all" style={{ borderColor: value === opt ? t.accent : t.border, background: value === opt ? t.accent + "20" : "transparent", color: t.text }}>
              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold border flex-shrink-0" style={{ borderColor: value === opt ? t.accent : t.muted, color: value === opt ? t.accent : t.muted }}>{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          ))}
        </div>
      );
    case "multi_select":
      const sel = value || [];
      return (
        <div className="space-y-2">
          {field.options.map((opt, i) => {
            const active = sel.includes(opt);
            return (
              <button key={i} onClick={() => onChange(active ? sel.filter((s: string) => s !== opt) : [...sel, opt])} className="w-full flex items-center gap-3 p-3 rounded-lg border text-sm text-left transition-all" style={{ borderColor: active ? t.accent : t.border, background: active ? t.accent + "20" : "transparent", color: t.text }}>
                <span className="w-5 h-5 rounded flex items-center justify-center text-xs border flex-shrink-0" style={{ borderColor: active ? t.accent : t.muted, color: active ? t.accent : t.muted }}>{active ? "✓" : ""}</span>
                {opt}
              </button>
            );
          })}
        </div>
      );
    case "rating":
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => onChange(n)} className="w-11 h-11 rounded-lg border flex items-center justify-center text-xl transition-all" style={{ borderColor: (value || 0) >= n ? t.accent : t.border, background: (value || 0) >= n ? t.accent + "20" : "transparent", color: (value || 0) >= n ? t.accent : t.muted }}>★</button>
          ))}
        </div>
      );
    case "scale":
      return (
        <div className="flex gap-1.5 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button key={n} onClick={() => onChange(n)} className="w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-medium transition-all" style={{ borderColor: value === n ? t.accent : t.border, background: value === n ? t.accent + "20" : "transparent", color: value === n ? t.accent : t.text }}>{n}</button>
          ))}
        </div>
      );
    case "yes_no":
      return (
        <div className="flex gap-3">
          {["Yes", "No"].map((v) => (
            <button key={v} onClick={() => onChange(v)} className="flex-1 py-4 rounded-lg border text-sm font-medium transition-all" style={{ borderColor: value === v ? t.accent : t.border, background: value === v ? t.accent + "20" : "transparent", color: value === v ? t.accent : t.text }}>{v}</button>
          ))}
        </div>
      );
    default:
      return <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Type your answer..." autoFocus style={inputBase} />;
  }
}
